export interface StaticProfile {
  interests: string[]
  skills: string[]
  profession?: string
  demographics?: {
    age_range?: string
    location?: string
    education?: string
  }
  long_term_patterns: string[]
  domains: string[]
  expertise_areas: string[]
  personality_traits?: string[]
  work_style?: {
    preferred_work_hours?: string
    collaboration_style?: string
    decision_making_style?: string
    problem_solving_approach?: string
  }
  communication_style?: {
    preferred_channels?: string[]
    communication_frequency?: string
    tone_preference?: string
  }
  learning_preferences?: {
    preferred_learning_methods?: string[]
    learning_pace?: string
    knowledge_retention_style?: string
  }
  values_and_priorities?: string[]
  technology_preferences?: {
    preferred_tools?: string[]
    tech_comfort_level?: string
    preferred_platforms?: string[]
  }
  lifestyle_patterns?: {
    activity_level?: string
    social_patterns?: string
    productivity_patterns?: string
  }
  cognitive_style?: {
    thinking_pattern?: string
    information_processing?: string
    creativity_level?: string
  }
  personal_narrative?: {
    who?: string
    why?: string
    what?: string
    how?: string
  }
}

export interface DynamicProfile {
  recent_activities: string[]
  current_projects: string[]
  temporary_interests: string[]
  recent_changes: string[]
  current_context: string[]
  active_goals?: string[]
  current_challenges?: string[]
  recent_achievements?: string[]
  current_focus_areas?: string[]
  emotional_state?: {
    current_concerns?: string[]
    current_excitements?: string[]
    stress_level?: string
  }
  active_research_topics?: string[]
  upcoming_events?: string[]
}

export interface ProfileExtractionResult {
  static_profile_json: StaticProfile
  static_profile_text: string
  dynamic_profile_json: DynamicProfile
  dynamic_profile_text: string
  isFallback?: boolean
}

import { Prisma } from '@prisma/client'

export interface UserProfile {
  id: string
  user_id: string
  static_profile_json: Prisma.JsonValue
  static_profile_text: string | null
  dynamic_profile_json: Prisma.JsonValue
  dynamic_profile_text: string | null
  last_updated: Date
  last_memory_analyzed: Date | null
  version: number
}
