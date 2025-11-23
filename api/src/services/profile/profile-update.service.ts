import { prisma } from '../../lib/prisma.lib'
import { getRedisClient } from '../../lib/redis.lib'
import { logger } from '../../utils/core/logger.util'
import { profileUpdaterService } from './profile-updater.service'
import type { UserProfile } from '../../types/profile.types'

export type { UserProfile }

const PROFILE_CACHE_PREFIX = 'user_profile:'
const PROFILE_CACHE_TTL = 10 * 60 // 10 minutes in seconds
const PROFILE_CONTEXT_CACHE_PREFIX = 'user_profile_context:'
const PROFILE_CONTEXT_CACHE_TTL = 5 * 60 // 5 minutes in seconds

function getProfileCacheKey(userId: string): string {
  return `${PROFILE_CACHE_PREFIX}${userId}`
}

function getProfileContextCacheKey(userId: string): string {
  return `${PROFILE_CONTEXT_CACHE_PREFIX}${userId}`
}

export class ProfileUpdateService {
  async updateUserProfile(userId: string, force: boolean = false): Promise<UserProfile> {
    return profileUpdaterService.updateUserProfile(userId, force)
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const cacheKey = getProfileCacheKey(userId)
      const client = getRedisClient()
      const cached = await client.get(cacheKey)

      if (cached) {
        return JSON.parse(cached) as UserProfile
      }
    } catch (error) {
      logger.warn('[profile] cache read error, continuing without cache', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    const profile = await prisma.userProfile.findUnique({
      where: { user_id: userId },
    })

    if (profile) {
      try {
        const cacheKey = getProfileCacheKey(userId)
        const client = getRedisClient()
        await client.setex(cacheKey, PROFILE_CACHE_TTL, JSON.stringify(profile))
      } catch (error) {
        logger.warn('[profile] cache write error', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return profile as UserProfile | null
  }

  async getProfileContext(userId: string): Promise<string> {
    try {
      const cacheKey = getProfileContextCacheKey(userId)
      const client = getRedisClient()
      const cached = await client.get(cacheKey)

      if (cached) {
        return cached
      }
    } catch (error) {
      logger.warn('[profile] context cache read error, continuing without cache', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    const profile = await this.getUserProfile(userId)

    if (!profile) {
      return ''
    }

    const staticText = profile.static_profile_text || ''
    const dynamicText = profile.dynamic_profile_text || ''

    if (!staticText && !dynamicText) {
      return ''
    }

    const parts: string[] = []

    // Start with comprehensive profile description
    if (staticText) {
      parts.push(`=== COMPLETE USER PROFILE ===\n${staticText}`)
    }

    // Add personal narrative prominently
    const staticJson = profile.static_profile_json as Record<string, unknown> | null
    const personalNarrative = staticJson?.personal_narrative as
      | {
          who?: string
          why?: string
          what?: string
          how?: string
        }
      | undefined

    if (personalNarrative) {
      const narrativeParts: string[] = []
      if (personalNarrative.who) {
        narrativeParts.push(`WHO:\n${personalNarrative.who}`)
      }
      if (personalNarrative.why) {
        narrativeParts.push(`WHY:\n${personalNarrative.why}`)
      }
      if (personalNarrative.what) {
        narrativeParts.push(`WHAT:\n${personalNarrative.what}`)
      }
      if (personalNarrative.how) {
        narrativeParts.push(`HOW:\n${personalNarrative.how}`)
      }
      if (narrativeParts.length > 0) {
        parts.push(`\n=== PERSONAL NARRATIVE ===\n${narrativeParts.join('\n\n')}`)
      }
    }

    // Extract and prominently display ALL user preferences
    if (staticJson) {
      const preferencesParts: string[] = []

      // Work Style Preferences
      const workStyle = staticJson.work_style as Record<string, unknown> | undefined
      if (workStyle && Object.keys(workStyle).length > 0) {
        const workStyleDetails: string[] = []
        if (workStyle.preferred_work_hours) {
          workStyleDetails.push(`Preferred Work Hours: ${workStyle.preferred_work_hours}`)
        }
        if (workStyle.collaboration_style) {
          workStyleDetails.push(`Collaboration Style: ${workStyle.collaboration_style}`)
        }
        if (workStyle.decision_making_style) {
          workStyleDetails.push(`Decision Making Style: ${workStyle.decision_making_style}`)
        }
        if (workStyle.problem_solving_approach) {
          workStyleDetails.push(`Problem Solving Approach: ${workStyle.problem_solving_approach}`)
        }
        if (workStyleDetails.length > 0) {
          preferencesParts.push(`WORK STYLE PREFERENCES:\n${workStyleDetails.join('\n')}`)
        }
      }

      // Communication Preferences
      const communicationStyle = staticJson.communication_style as
        | Record<string, unknown>
        | undefined
      if (communicationStyle && Object.keys(communicationStyle).length > 0) {
        const commDetails: string[] = []
        if (
          Array.isArray(communicationStyle.preferred_channels) &&
          communicationStyle.preferred_channels.length > 0
        ) {
          commDetails.push(
            `Preferred Channels: ${(communicationStyle.preferred_channels as string[]).join(', ')}`
          )
        }
        if (communicationStyle.communication_frequency) {
          commDetails.push(`Communication Frequency: ${communicationStyle.communication_frequency}`)
        }
        if (communicationStyle.tone_preference) {
          commDetails.push(`Tone Preference: ${communicationStyle.tone_preference}`)
        }
        if (commDetails.length > 0) {
          preferencesParts.push(`COMMUNICATION PREFERENCES:\n${commDetails.join('\n')}`)
        }
      }

      // Learning Preferences
      const learningPreferences = staticJson.learning_preferences as
        | Record<string, unknown>
        | undefined
      if (learningPreferences && Object.keys(learningPreferences).length > 0) {
        const learningDetails: string[] = []
        if (
          Array.isArray(learningPreferences.preferred_learning_methods) &&
          learningPreferences.preferred_learning_methods.length > 0
        ) {
          learningDetails.push(
            `Preferred Learning Methods: ${(learningPreferences.preferred_learning_methods as string[]).join(', ')}`
          )
        }
        if (learningPreferences.learning_pace) {
          learningDetails.push(`Learning Pace: ${learningPreferences.learning_pace}`)
        }
        if (learningPreferences.knowledge_retention_style) {
          learningDetails.push(
            `Knowledge Retention Style: ${learningPreferences.knowledge_retention_style}`
          )
        }
        if (learningDetails.length > 0) {
          preferencesParts.push(`LEARNING PREFERENCES:\n${learningDetails.join('\n')}`)
        }
      }

      // Technology Preferences
      const techPreferences = staticJson.technology_preferences as
        | Record<string, unknown>
        | undefined
      if (techPreferences && Object.keys(techPreferences).length > 0) {
        const techDetails: string[] = []
        if (
          Array.isArray(techPreferences.preferred_tools) &&
          techPreferences.preferred_tools.length > 0
        ) {
          techDetails.push(
            `Preferred Tools: ${(techPreferences.preferred_tools as string[]).join(', ')}`
          )
        }
        if (techPreferences.tech_comfort_level) {
          techDetails.push(`Tech Comfort Level: ${techPreferences.tech_comfort_level}`)
        }
        if (
          Array.isArray(techPreferences.preferred_platforms) &&
          techPreferences.preferred_platforms.length > 0
        ) {
          techDetails.push(
            `Preferred Platforms: ${(techPreferences.preferred_platforms as string[]).join(', ')}`
          )
        }
        if (techDetails.length > 0) {
          preferencesParts.push(`TECHNOLOGY PREFERENCES:\n${techDetails.join('\n')}`)
        }
      }

      // Cognitive Style Preferences
      const cognitiveStyle = staticJson.cognitive_style as Record<string, unknown> | undefined
      if (cognitiveStyle && Object.keys(cognitiveStyle).length > 0) {
        const cognitiveDetails: string[] = []
        if (cognitiveStyle.thinking_pattern) {
          cognitiveDetails.push(`Thinking Pattern: ${cognitiveStyle.thinking_pattern}`)
        }
        if (cognitiveStyle.information_processing) {
          cognitiveDetails.push(`Information Processing: ${cognitiveStyle.information_processing}`)
        }
        if (cognitiveStyle.creativity_level) {
          cognitiveDetails.push(`Creativity Level: ${cognitiveStyle.creativity_level}`)
        }
        if (cognitiveDetails.length > 0) {
          preferencesParts.push(`COGNITIVE STYLE PREFERENCES:\n${cognitiveDetails.join('\n')}`)
        }
      }

      // Lifestyle Preferences
      const lifestylePatterns = staticJson.lifestyle_patterns as Record<string, unknown> | undefined
      if (lifestylePatterns && Object.keys(lifestylePatterns).length > 0) {
        const lifestyleDetails: string[] = []
        if (lifestylePatterns.activity_level) {
          lifestyleDetails.push(`Activity Level: ${lifestylePatterns.activity_level}`)
        }
        if (lifestylePatterns.social_patterns) {
          lifestyleDetails.push(`Social Patterns: ${lifestylePatterns.social_patterns}`)
        }
        if (lifestylePatterns.productivity_patterns) {
          lifestyleDetails.push(`Productivity Patterns: ${lifestylePatterns.productivity_patterns}`)
        }
        if (lifestyleDetails.length > 0) {
          preferencesParts.push(`LIFESTYLE PREFERENCES:\n${lifestyleDetails.join('\n')}`)
        }
      }

      // Values and Priorities
      if (
        Array.isArray(staticJson.values_and_priorities) &&
        staticJson.values_and_priorities.length > 0
      ) {
        preferencesParts.push(
          `VALUES AND PRIORITIES:\n${(staticJson.values_and_priorities as string[]).join(', ')}`
        )
      }

      // Interests
      if (Array.isArray(staticJson.interests) && staticJson.interests.length > 0) {
        preferencesParts.push(`INTERESTS:\n${(staticJson.interests as string[]).join(', ')}`)
      }

      // Skills
      if (Array.isArray(staticJson.skills) && staticJson.skills.length > 0) {
        preferencesParts.push(`SKILLS:\n${(staticJson.skills as string[]).join(', ')}`)
      }

      // Profession
      if (staticJson.profession) {
        preferencesParts.push(`PROFESSION:\n${staticJson.profession}`)
      }

      // Personality Traits
      if (
        Array.isArray(staticJson.personality_traits) &&
        staticJson.personality_traits.length > 0
      ) {
        preferencesParts.push(
          `PERSONALITY TRAITS:\n${(staticJson.personality_traits as string[]).join(', ')}`
        )
      }

      // Add preferences section prominently
      if (preferencesParts.length > 0) {
        parts.push(
          `\n=== USER PREFERENCES (IMPORTANT - USE THESE WHEN RESPONDING) ===\n${preferencesParts.join('\n\n')}`
        )
      }
    }

    // Add current dynamic context
    if (dynamicText) {
      parts.push(`\n=== CURRENT CONTEXT AND STATE ===\n${dynamicText}`)
    }

    // Add dynamic profile details
    const dynamicJson = profile.dynamic_profile_json as Record<string, unknown> | null
    if (dynamicJson) {
      const dynamicParts: string[] = []

      if (Array.isArray(dynamicJson.current_projects) && dynamicJson.current_projects.length > 0) {
        dynamicParts.push(
          `Current Projects: ${(dynamicJson.current_projects as string[]).join(', ')}`
        )
      }

      if (Array.isArray(dynamicJson.active_goals) && dynamicJson.active_goals.length > 0) {
        dynamicParts.push(`Active Goals: ${(dynamicJson.active_goals as string[]).join(', ')}`)
      }

      if (
        Array.isArray(dynamicJson.current_focus_areas) &&
        dynamicJson.current_focus_areas.length > 0
      ) {
        dynamicParts.push(
          `Current Focus Areas: ${(dynamicJson.current_focus_areas as string[]).join(', ')}`
        )
      }

      if (
        Array.isArray(dynamicJson.active_research_topics) &&
        dynamicJson.active_research_topics.length > 0
      ) {
        dynamicParts.push(
          `Active Research Topics: ${(dynamicJson.active_research_topics as string[]).join(', ')}`
        )
      }

      if (dynamicParts.length > 0) {
        parts.push(`\n=== CURRENT ACTIVITIES ===\n${dynamicParts.join('\n')}`)
      }
    }

    const context = parts.join('\n\n')

    try {
      const cacheKey = getProfileContextCacheKey(userId)
      const client = getRedisClient()
      await client.setex(cacheKey, PROFILE_CONTEXT_CACHE_TTL, context)
    } catch (error) {
      logger.warn('[profile] context cache write error', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return context
  }

  async shouldUpdateProfile(userId: string, daysSinceLastUpdate: number = 7): Promise<boolean> {
    const profile = await this.getUserProfile(userId)

    if (!profile) {
      return true
    }

    const lastUpdated =
      profile.last_updated instanceof Date ? profile.last_updated : new Date(profile.last_updated)
    const daysSince = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    return daysSince >= daysSinceLastUpdate
  }

  async getUsersNeedingUpdate(daysSinceLastUpdate: number = 7): Promise<string[]> {
    const cutoffDate = new Date(Date.now() - daysSinceLastUpdate * 24 * 60 * 60 * 1000)

    const allUsers = await prisma.user.findMany({
      select: { id: true },
    })

    const usersNeedingUpdate: string[] = []

    for (const user of allUsers) {
      const profile = await prisma.userProfile.findUnique({
        where: { user_id: user.id },
        select: { last_updated: true },
      })

      if (!profile) {
        usersNeedingUpdate.push(user.id)
        continue
      }

      const lastUpdated =
        profile.last_updated instanceof Date ? profile.last_updated : new Date(profile.last_updated)

      if (lastUpdated < cutoffDate) {
        usersNeedingUpdate.push(user.id)
      }
    }

    return usersNeedingUpdate
  }

  async getUsersNeedingUpdateByHours(hoursSinceLastUpdate: number): Promise<string[]> {
    const cutoffDate = new Date(Date.now() - hoursSinceLastUpdate * 60 * 60 * 1000)

    const allUsers = await prisma.user.findMany({
      select: { id: true },
    })

    const usersNeedingUpdate: string[] = []

    for (const user of allUsers) {
      const profile = await prisma.userProfile.findUnique({
        where: { user_id: user.id },
        select: { last_updated: true },
      })

      if (!profile) {
        usersNeedingUpdate.push(user.id)
        continue
      }

      const lastUpdated =
        profile.last_updated instanceof Date ? profile.last_updated : new Date(profile.last_updated)

      if (lastUpdated < cutoffDate) {
        usersNeedingUpdate.push(user.id)
      }
    }

    return usersNeedingUpdate
  }
}

export const profileUpdateService = new ProfileUpdateService()
