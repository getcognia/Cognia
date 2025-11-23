import { Prisma } from '@prisma/client'
import type {
  ProfileExtractionResult,
  StaticProfile,
  DynamicProfile,
} from '../../types/profile.types'

export class ProfileFallbackService {
  extractProfileFallback(
    memories: Array<{
      id: string
      title: string | null
      content_preview?: string | null
      content: string
      created_at: Date
      page_metadata: Prisma.JsonValue
    }>
  ): ProfileExtractionResult {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const allTopics = new Set<string>()
    const allCategories = new Set<string>()
    const recentTopics = new Set<string>()
    const recentCategories = new Set<string>()

    memories.forEach(m => {
      const metadata = m.page_metadata as Record<string, unknown> | null
      const isRecent = m.created_at >= thirtyDaysAgo

      if (metadata?.topics && Array.isArray(metadata.topics)) {
        metadata.topics.forEach((topic: unknown) => {
          if (typeof topic === 'string') {
            allTopics.add(topic)
            if (isRecent) recentTopics.add(topic)
          }
        })
      }

      if (metadata?.categories && Array.isArray(metadata.categories)) {
        metadata.categories.forEach((cat: unknown) => {
          if (typeof cat === 'string') {
            allCategories.add(cat)
            if (isRecent) recentCategories.add(cat)
          }
        })
      }
    })

    const staticProfile: StaticProfile = {
      interests: Array.from(allTopics).slice(0, 10),
      skills: [],
      long_term_patterns: Array.from(allCategories).slice(0, 5),
      domains: Array.from(allCategories).slice(0, 5),
      expertise_areas: Array.from(allTopics).slice(0, 5),
      personality_traits: [],
      work_style: {},
      communication_style: {},
      learning_preferences: {},
      values_and_priorities: [],
      technology_preferences: {},
      lifestyle_patterns: {},
      cognitive_style: {},
      personal_narrative: {
        who: `User interested in: ${Array.from(allTopics).slice(0, 5).join(', ')}`,
        why: 'Motivations and goals inferred from content patterns',
        what: `Active in: ${Array.from(allCategories).slice(0, 3).join(', ')}`,
        how: 'Approach and methods inferred from engagement patterns',
      },
    }

    const dynamicProfile: DynamicProfile = {
      recent_activities: Array.from(recentTopics).slice(0, 5),
      current_projects: [],
      temporary_interests: Array.from(recentTopics).slice(0, 5),
      recent_changes: [],
      current_context: Array.from(recentCategories).slice(0, 3),
      active_goals: [],
      current_challenges: [],
      recent_achievements: [],
      current_focus_areas: [],
      emotional_state: {},
      active_research_topics: Array.from(recentTopics).slice(0, 5),
      upcoming_events: [],
    }

    const staticText = `This user is interested in: ${Array.from(allTopics).slice(0, 10).join(', ')}. They are active in domains: ${Array.from(allCategories).slice(0, 5).join(', ')}. Their long-term patterns include engagement with: ${Array.from(allCategories).slice(0, 5).join(', ')}.`

    const dynamicText = `Currently, this user is recently interested in: ${Array.from(recentTopics).slice(0, 10).join(', ')}. Their recent activities focus on: ${Array.from(recentCategories).slice(0, 5).join(', ')}.`

    return {
      static_profile_json: staticProfile,
      static_profile_text: staticText,
      dynamic_profile_json: dynamicProfile,
      dynamic_profile_text: dynamicText,
    }
  }

  getEmptyProfile(): ProfileExtractionResult {
    return {
      static_profile_json: {
        interests: [],
        skills: [],
        long_term_patterns: [],
        domains: [],
        expertise_areas: [],
        personality_traits: [],
        work_style: {},
        communication_style: {},
        learning_preferences: {},
        values_and_priorities: [],
        technology_preferences: {},
        lifestyle_patterns: {},
        cognitive_style: {},
        personal_narrative: {
          who: 'No profile information available yet. Profile will be built as the user creates memories and engages with content.',
          why: 'No profile information available yet. Motivations and goals will be inferred as more information becomes available.',
          what: 'No profile information available yet. Interests and activities will be identified as the user saves content.',
          how: 'No profile information available yet. Work style and preferences will be determined from user behavior patterns.',
        },
      },
      static_profile_text:
        'No profile information available yet. A comprehensive profile will be built as the user creates memories and engages with content. The profile will capture their complete identity, personality, preferences, work style, communication style, learning preferences, values, thinking patterns, and unique characteristics.',
      dynamic_profile_json: {
        recent_activities: [],
        current_projects: [],
        temporary_interests: [],
        recent_changes: [],
        current_context: [],
        active_goals: [],
        current_challenges: [],
        recent_achievements: [],
        current_focus_areas: [],
        emotional_state: {},
        active_research_topics: [],
        upcoming_events: [],
      },
      dynamic_profile_text:
        'No recent context available yet. Current activities, goals, challenges, and focus areas will be identified as the user creates new memories.',
    }
  }
}

export const profileFallbackService = new ProfileFallbackService()
