import { prisma } from '../../lib/prisma.lib'
import { profileExtractionService } from './profile-extraction.service'
import { getRedisClient } from '../../lib/redis.lib'
import { logger } from '../../utils/core/logger.util'
import { Prisma } from '@prisma/client'
import type { ProfileExtractionResult, UserProfile } from '../../types/profile.types'
import { profileValidatorService } from './profile-validator.service'

export type { UserProfile }

const PROFILE_CACHE_PREFIX = 'user_profile:'

function getProfileCacheKey(userId: string): string {
  return `${PROFILE_CACHE_PREFIX}${userId}`
}

async function invalidateProfileCache(userId: string): Promise<void> {
  try {
    const client = getRedisClient()
    await client.del(getProfileCacheKey(userId))
  } catch (error) {
    logger.warn('[profile] cache invalidation error', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export class ProfileUpdaterService {
  async updateUserProfile(userId: string, force: boolean = false): Promise<UserProfile> {
    const existingProfile = await prisma.userProfile.findUnique({
      where: { user_id: userId },
    })

    const allMemoriesRaw = await prisma.memory.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        page_metadata: true,
      },
      orderBy: { created_at: 'desc' },
    })

    if (allMemoriesRaw.length === 0) {
      throw new Error('No memories found for user')
    }

    const lastAnalyzedDate = force ? null : existingProfile?.last_memory_analyzed || null
    const now = new Date()

    const selectedMemories = this.selectMemoriesDynamically(
      allMemoriesRaw,
      existingProfile,
      lastAnalyzedDate,
      now
    )

    if (selectedMemories.length === 0 && existingProfile && !force) {
      return existingProfile as UserProfile
    }

    let extractionResult: ProfileExtractionResult

    try {
      extractionResult = await profileExtractionService.extractProfileFromMemories(
        userId,
        selectedMemories,
        existingProfile
      )
    } catch (error) {
      logger.error('Error extracting profile, retrying once:', error)

      try {
        extractionResult = await profileExtractionService.extractProfileFromMemories(
          userId,
          selectedMemories,
          existingProfile
        )
      } catch (retryError) {
        logger.error('Error extracting profile on retry:', retryError)

        if (existingProfile) {
          logger.log('Preserving existing profile due to extraction failure')
          return existingProfile as UserProfile
        }

        throw new Error('Failed to extract profile and no existing profile to preserve')
      }
    }

    if (extractionResult.isFallback) {
      logger.warn('[Profile Extraction] Fallback used - preserving existing profile')
      if (existingProfile) {
        return existingProfile as UserProfile
      }
      throw new Error(
        'Failed to extract profile (fallback used) and no existing profile to preserve'
      )
    }

    if (existingProfile && !force && lastAnalyzedDate) {
      const merged = this.mergeProfiles(existingProfile, extractionResult)
      extractionResult = merged
    }

    const latestMemory =
      selectedMemories.length > 0
        ? selectedMemories[0]
        : allMemoriesRaw.length > 0
          ? allMemoriesRaw[0]
          : await prisma.memory.findFirst({
              where: { user_id: userId },
              orderBy: { created_at: 'desc' },
            })

    const profile = await prisma.userProfile.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        static_profile_json: extractionResult.static_profile_json as unknown as Prisma.JsonValue,
        static_profile_text: extractionResult.static_profile_text,
        dynamic_profile_json: extractionResult.dynamic_profile_json as unknown as Prisma.JsonValue,
        dynamic_profile_text: extractionResult.dynamic_profile_text,
        last_memory_analyzed: latestMemory?.created_at || null,
        version: 1,
      },
      update: {
        static_profile_json: extractionResult.static_profile_json as unknown as Prisma.JsonValue,
        static_profile_text: extractionResult.static_profile_text,
        dynamic_profile_json: extractionResult.dynamic_profile_json as unknown as Prisma.JsonValue,
        dynamic_profile_text: extractionResult.dynamic_profile_text,
        last_memory_analyzed: latestMemory?.created_at || null,
        version: { increment: 1 },
      },
    })

    await invalidateProfileCache(userId)

    return profile as UserProfile
  }

  selectMemoriesDynamically(
    allMemories: Array<{
      id: string
      title: string | null
      content: string
      created_at: Date
      page_metadata: Prisma.JsonValue
    }>,
    existingProfile: UserProfile | null,
    lastAnalyzedDate: Date | null,
    now: Date
  ): Array<{
    id: string
    title: string | null
    content: string
    created_at: Date
    page_metadata: Prisma.JsonValue
  }> {
    if (allMemories.length === 0) {
      return []
    }

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    const mostRecentMemory = allMemories[0]
    const daysSinceLastMemory =
      (now.getTime() - mostRecentMemory.created_at.getTime()) / (1000 * 60 * 60 * 24)
    const isVeryActive = daysSinceLastMemory <= 1
    const isActive = daysSinceLastMemory <= 7

    const selected: Array<{
      id: string
      title: string | null
      content: string
      created_at: Date
      page_metadata: Prisma.JsonValue
    }> = []
    const selectedIds = new Set<string>()

    if (!existingProfile || !lastAnalyzedDate) {
      const veryRecent = allMemories.filter(m => m.created_at >= sevenDaysAgo)
      veryRecent.forEach(m => {
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      })

      const recent = allMemories.filter(
        m => m.created_at >= thirtyDaysAgo && m.created_at < sevenDaysAgo
      )
      const recentToInclude = isVeryActive
        ? recent
        : recent.slice(0, Math.ceil(recent.length * 0.8))
      recentToInclude.forEach(m => {
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      })

      const midTerm = allMemories.filter(
        m => m.created_at >= ninetyDaysAgo && m.created_at < thirtyDaysAgo
      )
      for (let i = 0; i < midTerm.length; i += 3) {
        const m = midTerm[i]
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      }

      const older = allMemories.filter(
        m => m.created_at >= oneYearAgo && m.created_at < ninetyDaysAgo
      )
      for (let i = 0; i < older.length; i += 5) {
        const m = older[i]
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      }

      const veryOld = allMemories.filter(m => m.created_at < oneYearAgo)
      for (let i = 0; i < veryOld.length; i += 10) {
        const m = veryOld[i]
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      }

      return selected.sort((a, b) => b.created_at.getTime() - a.created_at.getTime()).slice(0, 200)
    }

    const newMemories = allMemories.filter(
      m => !lastAnalyzedDate || m.created_at > lastAnalyzedDate
    )

    newMemories.forEach(m => {
      if (!selectedIds.has(m.id)) {
        selected.push(m)
        selectedIds.add(m.id)
      }
    })

    if (isVeryActive) {
      const veryRecent = allMemories.filter(
        m => m.created_at >= sevenDaysAgo && (!lastAnalyzedDate || m.created_at <= lastAnalyzedDate)
      )
      veryRecent.forEach(m => {
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      })

      const recent = allMemories.filter(
        m =>
          m.created_at >= thirtyDaysAgo &&
          m.created_at < sevenDaysAgo &&
          (!lastAnalyzedDate || m.created_at <= lastAnalyzedDate)
      )
      recent.slice(0, Math.ceil(recent.length * 0.9)).forEach(m => {
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      })

      const older = allMemories.filter(
        m => m.created_at < thirtyDaysAgo && (!lastAnalyzedDate || m.created_at <= lastAnalyzedDate)
      )
      for (let i = 0; i < older.length; i += 7) {
        const m = older[i]
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      }
    } else if (isActive) {
      const recent = allMemories.filter(
        m =>
          m.created_at >= thirtyDaysAgo && (!lastAnalyzedDate || m.created_at <= lastAnalyzedDate)
      )
      recent.slice(0, Math.ceil(recent.length * 0.8)).forEach(m => {
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      })

      const older = allMemories.filter(
        m => m.created_at < thirtyDaysAgo && (!lastAnalyzedDate || m.created_at <= lastAnalyzedDate)
      )
      for (let i = 0; i < older.length; i += 5) {
        const m = older[i]
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      }
    } else {
      const recent = allMemories.filter(
        m =>
          m.created_at >= thirtyDaysAgo && (!lastAnalyzedDate || m.created_at <= lastAnalyzedDate)
      )
      recent.forEach(m => {
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      })

      const older = allMemories.filter(
        m => m.created_at < thirtyDaysAgo && (!lastAnalyzedDate || m.created_at <= lastAnalyzedDate)
      )
      for (let i = 0; i < older.length; i += 3) {
        const m = older[i]
        if (!selectedIds.has(m.id)) {
          selected.push(m)
          selectedIds.add(m.id)
        }
      }
    }

    return selected.sort((a, b) => b.created_at.getTime() - a.created_at.getTime()).slice(0, 200)
  }

  mergeProfiles(
    existing: {
      static_profile_json?: Prisma.JsonValue
      dynamic_profile_json?: Prisma.JsonValue
      static_profile_text?: string | null
      dynamic_profile_text?: string | null
    },
    newExtraction: ProfileExtractionResult
  ): ProfileExtractionResult {
    const existingStatic =
      existing.static_profile_json &&
      typeof existing.static_profile_json === 'object' &&
      existing.static_profile_json !== null &&
      !Array.isArray(existing.static_profile_json)
        ? (existing.static_profile_json as Record<string, unknown>)
        : {}
    const existingDynamic =
      existing.dynamic_profile_json &&
      typeof existing.dynamic_profile_json === 'object' &&
      existing.dynamic_profile_json !== null &&
      !Array.isArray(existing.dynamic_profile_json)
        ? (existing.dynamic_profile_json as Record<string, unknown>)
        : {}

    const existingInterests = Array.isArray(existingStatic.interests)
      ? (existingStatic.interests as string[])
      : []
    const existingSkills = Array.isArray(existingStatic.skills)
      ? (existingStatic.skills as string[])
      : []
    const existingLongTermPatterns = Array.isArray(existingStatic.long_term_patterns)
      ? (existingStatic.long_term_patterns as string[])
      : []
    const existingDomains = Array.isArray(existingStatic.domains)
      ? (existingStatic.domains as string[])
      : []
    const existingExpertiseAreas = Array.isArray(existingStatic.expertise_areas)
      ? (existingStatic.expertise_areas as string[])
      : []
    const existingPersonalityTraits = Array.isArray(existingStatic.personality_traits)
      ? (existingStatic.personality_traits as string[])
      : []
    const existingValuesAndPriorities = Array.isArray(existingStatic.values_and_priorities)
      ? (existingStatic.values_and_priorities as string[])
      : []
    const existingDemographics =
      existingStatic.demographics &&
      typeof existingStatic.demographics === 'object' &&
      existingStatic.demographics !== null &&
      !Array.isArray(existingStatic.demographics)
        ? (existingStatic.demographics as Record<string, unknown>)
        : {}

    const mergedStatic = {
      interests: this.mergeArrays(
        existingInterests,
        newExtraction.static_profile_json.interests || []
      ),
      skills: this.mergeArrays(existingSkills, newExtraction.static_profile_json.skills || []),
      profession:
        newExtraction.static_profile_json.profession ||
        (typeof existingStatic.profession === 'string' ? existingStatic.profession : undefined),
      demographics: {
        ...existingDemographics,
        ...newExtraction.static_profile_json.demographics,
      },
      long_term_patterns: this.mergeArrays(
        existingLongTermPatterns,
        newExtraction.static_profile_json.long_term_patterns || []
      ),
      domains: this.mergeArrays(existingDomains, newExtraction.static_profile_json.domains || []),
      expertise_areas: this.mergeArrays(
        existingExpertiseAreas,
        newExtraction.static_profile_json.expertise_areas || []
      ),
      personality_traits: this.mergeArrays(
        existingPersonalityTraits,
        newExtraction.static_profile_json.personality_traits || []
      ),
      work_style: {
        ...(existingStatic.work_style &&
        typeof existingStatic.work_style === 'object' &&
        existingStatic.work_style !== null &&
        !Array.isArray(existingStatic.work_style)
          ? (existingStatic.work_style as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.work_style,
      },
      communication_style: {
        ...(existingStatic.communication_style &&
        typeof existingStatic.communication_style === 'object' &&
        existingStatic.communication_style !== null &&
        !Array.isArray(existingStatic.communication_style)
          ? (existingStatic.communication_style as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.communication_style,
      },
      learning_preferences: {
        ...(existingStatic.learning_preferences &&
        typeof existingStatic.learning_preferences === 'object' &&
        existingStatic.learning_preferences !== null &&
        !Array.isArray(existingStatic.learning_preferences)
          ? (existingStatic.learning_preferences as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.learning_preferences,
      },
      values_and_priorities: this.mergeArrays(
        existingValuesAndPriorities,
        newExtraction.static_profile_json.values_and_priorities || []
      ),
      technology_preferences: {
        ...(existingStatic.technology_preferences &&
        typeof existingStatic.technology_preferences === 'object' &&
        existingStatic.technology_preferences !== null &&
        !Array.isArray(existingStatic.technology_preferences)
          ? (existingStatic.technology_preferences as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.technology_preferences,
      },
      lifestyle_patterns: {
        ...(existingStatic.lifestyle_patterns &&
        typeof existingStatic.lifestyle_patterns === 'object' &&
        existingStatic.lifestyle_patterns !== null &&
        !Array.isArray(existingStatic.lifestyle_patterns)
          ? (existingStatic.lifestyle_patterns as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.lifestyle_patterns,
      },
      cognitive_style: {
        ...(existingStatic.cognitive_style &&
        typeof existingStatic.cognitive_style === 'object' &&
        existingStatic.cognitive_style !== null &&
        !Array.isArray(existingStatic.cognitive_style)
          ? (existingStatic.cognitive_style as Record<string, unknown>)
          : {}),
        ...newExtraction.static_profile_json.cognitive_style,
      },
    }

    const existingCurrentProjects = Array.isArray(existingDynamic.current_projects)
      ? (existingDynamic.current_projects as string[])
      : []
    const existingRecentChanges = Array.isArray(existingDynamic.recent_changes)
      ? (existingDynamic.recent_changes as string[])
      : []
    const existingActiveGoals = Array.isArray(existingDynamic.active_goals)
      ? (existingDynamic.active_goals as string[])
      : []
    const existingRecentAchievements = Array.isArray(existingDynamic.recent_achievements)
      ? (existingDynamic.recent_achievements as string[])
      : []
    const existingEmotionalState =
      existingDynamic.emotional_state &&
      typeof existingDynamic.emotional_state === 'object' &&
      existingDynamic.emotional_state !== null &&
      !Array.isArray(existingDynamic.emotional_state)
        ? (existingDynamic.emotional_state as Record<string, unknown>)
        : {}

    const mergedDynamic = {
      recent_activities: newExtraction.dynamic_profile_json.recent_activities || [],
      current_projects: this.mergeArrays(
        existingCurrentProjects,
        newExtraction.dynamic_profile_json.current_projects || []
      ),
      temporary_interests: newExtraction.dynamic_profile_json.temporary_interests || [],
      recent_changes: this.mergeArrays(
        existingRecentChanges,
        newExtraction.dynamic_profile_json.recent_changes || []
      ),
      current_context: newExtraction.dynamic_profile_json.current_context || [],
      active_goals: this.mergeArrays(
        existingActiveGoals,
        newExtraction.dynamic_profile_json.active_goals || []
      ),
      current_challenges: newExtraction.dynamic_profile_json.current_challenges || [],
      recent_achievements: this.mergeArrays(
        existingRecentAchievements,
        newExtraction.dynamic_profile_json.recent_achievements || []
      ),
      current_focus_areas: newExtraction.dynamic_profile_json.current_focus_areas || [],
      emotional_state: {
        ...existingEmotionalState,
        ...newExtraction.dynamic_profile_json.emotional_state,
      },
      active_research_topics: newExtraction.dynamic_profile_json.active_research_topics || [],
      upcoming_events: newExtraction.dynamic_profile_json.upcoming_events || [],
    }

    return {
      static_profile_json: mergedStatic,
      static_profile_text: newExtraction.static_profile_text || existing.static_profile_text || '',
      dynamic_profile_json: mergedDynamic,
      dynamic_profile_text:
        newExtraction.dynamic_profile_text || existing.dynamic_profile_text || '',
    }
  }

  private mergeArrays(existing: string[], newItems: string[]): string[] {
    return profileValidatorService.mergeArrays(existing, newItems)
  }
}

export const profileUpdaterService = new ProfileUpdaterService()
