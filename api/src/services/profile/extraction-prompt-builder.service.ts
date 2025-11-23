import { Prisma } from '@prisma/client'

export class ExtractionPromptBuilderService {
  prepareMemoryContext(
    memories: Array<{
      id: string
      title: string | null
      content_preview?: string | null
      content: string
      created_at: Date
      page_metadata: Prisma.JsonValue
    }>,
    existingProfile?: {
      static_profile_json?: unknown
      static_profile_text?: string | null
      dynamic_profile_json?: unknown
      dynamic_profile_text?: string | null
    } | null
  ): string {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const allMemories = memories
      .map((m, idx) => {
        const metadata = m.page_metadata as Record<string, unknown> | null
        const daysAgo = Math.floor((now.getTime() - m.created_at.getTime()) / (1000 * 60 * 60 * 24))
        const isRecent = m.created_at >= thirtyDaysAgo
        const isVeryRecent = m.created_at >= sevenDaysAgo

        const topics = Array.isArray(metadata?.topics)
          ? metadata.topics.filter((t): t is string => typeof t === 'string').join(', ')
          : 'N/A'
        const categories = Array.isArray(metadata?.categories)
          ? metadata.categories.filter((c): c is string => typeof c === 'string').join(', ')
          : 'N/A'

        const isUpdate = !!existingProfile
        let content: string
        if (isVeryRecent) {
          content = m.content || m.content_preview || ''
        } else if (isRecent) {
          const fullContent = m.content || m.content_preview || ''
          const maxLength = isUpdate ? 1500 : 1000
          content =
            fullContent.length > maxLength
              ? fullContent.substring(0, maxLength) + '...'
              : fullContent
        } else {
          const fullContent = m.content || m.content_preview || ''
          const maxLength = isUpdate ? 800 : 500
          content =
            fullContent.length > maxLength
              ? fullContent.substring(0, maxLength) + '...'
              : fullContent
        }

        return `Memory ${idx + 1} (${daysAgo} days ago${isRecent ? ', RECENT' : ''}${isVeryRecent ? ', VERY RECENT' : ''}):
Title: ${m.title || 'Untitled'}
Topics: ${topics}
Categories: ${categories}
Content: ${content}`
      })
      .join('\n\n')

    const recentCount = memories.filter(m => m.created_at >= thirtyDaysAgo).length
    const veryRecentCount = memories.filter(m => m.created_at >= sevenDaysAgo).length
    const totalCount = memories.length

    let contextHeader = `Total memories analyzed: ${totalCount}
Recent memories (last 30 days): ${recentCount}
Very recent memories (last 7 days): ${veryRecentCount}`

    if (existingProfile) {
      contextHeader += `\n\nEXISTING PROFILE CONTEXT:
The user already has a profile. Focus on:
1. UPDATING and ENRICHING existing information with new details
2. IDENTIFYING NEW information not yet captured in the profile
3. REFINING and making more specific any generic or incomplete information
4. UPDATING dynamic information (current state, goals, challenges, etc.)
5. ADDING new preferences, traits, or characteristics discovered in these memories

The profile should be COMPREHENSIVE - include everything about the user, not just what's new.`
    } else {
      contextHeader += `\n\nINITIAL PROFILE EXTRACTION:
This is the first time building a profile for this user. Extract EVERYTHING comprehensively:
- Complete personality, preferences, behaviors, values, goals
- Work style, communication style, learning preferences
- Technology preferences, cognitive style, lifestyle patterns
- Interests, skills, expertise, motivations, unique characteristics
- Build a complete, detailed profile that tells the full story of who they are.`
    }

    contextHeader += `\n\nIMPORTANT: Analyze ALL memories comprehensively to extract EVERYTHING about this user. Go deep into the content to understand the full picture of who they are. Be specific, personal, and comprehensive.`

    return `${contextHeader}

Memories:
${allMemories}`
  }

  buildExtractionPrompt(
    memoryContext: string,
    existingProfile?: {
      static_profile_json?: unknown
      static_profile_text?: string | null
      dynamic_profile_json?: unknown
      dynamic_profile_text?: string | null
    } | null
  ): string {
    let profileContextNote = ''
    if (existingProfile) {
      const existingStaticText = existingProfile.static_profile_text || ''
      const existingDynamicText = existingProfile.dynamic_profile_text || ''
      profileContextNote = `\n\nEXISTING PROFILE INFORMATION (for reference - build upon and enhance this):
${existingStaticText ? `Static Profile: ${existingStaticText.substring(0, 500)}...` : ''}
${existingDynamicText ? `Dynamic Profile: ${existingDynamicText.substring(0, 300)}...` : ''}

IMPORTANT: Use the existing profile as a foundation, but:
- ENRICH it with new details from the memories
- ADD new information not yet captured
- REFINE generic statements to be more specific
- UPDATE dynamic information (current state, goals, etc.)
- Make it MORE comprehensive, not less`
    }

    return `You are Cognia profile extraction system. Your task is to deeply understand EVERYTHING about this user - their complete identity, personality, preferences, behaviors, motivations, and unique characteristics. Create a comprehensive, deeply personalized profile that tells the complete story of who they are as a person.${profileContextNote}

CRITICAL: Return ONLY valid JSON. No explanations, no markdown formatting, no code blocks, no special characters. Just the JSON object.

IMPORTANT JSON RULES:
- All strings must be properly escaped (use \\" for quotes inside strings, \\n for newlines)
- No trailing commas
- All property names must be in double quotes
- All string values must be in double quotes
- Escape all special characters in strings (quotes, newlines, backslashes)
- Do not include any text before or after the JSON object
- The JSON must be valid and parseable

Return a JSON object with this exact structure:
{
  "static_profile_json": {
    "interests": ["long-term interests and passions - be comprehensive and specific"],
    "skills": ["skills, expertise, and competencies - include both technical and soft skills"],
    "profession": "profession, field, or career path - be specific",
    "demographics": {
      "age_range": "age range if evident",
      "location": "location if evident",
      "education": "education level if evident"
    },
    "long_term_patterns": ["persistent behavioral patterns, habits, or tendencies - what do they consistently do?"],
    "domains": ["knowledge domains and areas of focus - be comprehensive"],
    "expertise_areas": ["areas of deep expertise - what are they really good at?"],
    "personality_traits": ["personality characteristics inferred from behavior and content - be specific and detailed"],
    "work_style": {
      "preferred_work_hours": "when they seem most active or productive - be specific",
      "collaboration_style": "how they work with others (independent, collaborative, etc.) - detailed description",
      "decision_making_style": "how they make decisions (analytical, intuitive, etc.) - be specific",
      "problem_solving_approach": "how they approach problems (systematic, creative, etc.) - detailed"
    },
    "communication_style": {
      "preferred_channels": ["communication methods they use - be comprehensive"],
      "communication_frequency": "how often they communicate - be specific",
      "tone_preference": "formal, casual, technical, etc. - detailed description"
    },
    "learning_preferences": {
      "preferred_learning_methods": ["how they learn (reading, videos, hands-on, etc.) - be comprehensive"],
      "learning_pace": "fast, methodical, deep-dive, etc. - be specific",
      "knowledge_retention_style": "how they retain information - detailed description"
    },
    "values_and_priorities": ["core values and what matters to them - be comprehensive and specific"],
    "technology_preferences": {
      "preferred_tools": ["tools, platforms, or technologies they use - be comprehensive"],
      "tech_comfort_level": "early adopter, mainstream, cautious, etc. - be specific",
      "preferred_platforms": ["platforms they prefer - be comprehensive"]
    },
    "lifestyle_patterns": {
      "activity_level": "active, balanced, focused, etc. - be specific",
      "social_patterns": "social preferences and patterns - detailed description",
      "productivity_patterns": "how they organize and manage productivity - be comprehensive"
    },
    "cognitive_style": {
      "thinking_pattern": "analytical, creative, practical, strategic, etc. - be specific and detailed",
      "information_processing": "how they process information (detail-oriented, big-picture, etc.) - detailed",
      "creativity_level": "highly creative, methodical, balanced, etc. - be specific"
    },
    "personal_narrative": {
      "who": "A comprehensive, detailed description (400-800 words) of WHO this person is - their complete identity, role, background, core characteristics, personality essence, values, beliefs, quirks, strengths, weaknesses, and what makes them uniquely them. This should tell the complete story of their identity. Include: their professional identity, personal identity, how they see themselves, how others might see them, their core traits, their background, their current life stage, their relationships with work, learning, technology, and life. Be deeply personal, specific, and comprehensive. Write as if you're describing someone you know intimately.",
      "why": "A comprehensive, detailed explanation (300-600 words) of WHY they do what they do - their complete motivations, driving forces, goals (both explicit and implicit), values, reasons for actions, what inspires them, what they're passionate about, what they're trying to achieve, what they care about most, their deeper purpose, their aspirations, their fears, their hopes. This should explain their complete motivational landscape. Be deeply personal and specific.",
      "what": "A comprehensive, detailed description (300-600 words) of WHAT they do, focus on, and engage with - their complete range of interests, activities, projects, areas of focus, work, hobbies, learning pursuits, and what occupies their attention. Cover both long-term and current activities. Include: their work, their projects, their interests, their hobbies, their learning pursuits, what they research, what they create, what they consume, what they engage with. Be comprehensive and specific.",
      "how": "A comprehensive, detailed explanation (300-600 words) of HOW they approach things - their complete methods, styles, approaches, preferences, ways of working, learning, thinking, creating, problem-solving, decision-making, communicating, and engaging with the world. Include: their work methodology, their learning approach, their problem-solving style, their decision-making process, their communication approach, their creative process, their research methods, their tool usage patterns, their workflow preferences. Be detailed and specific."
    }
  },
  "static_profile_text": "A rich, comprehensive, detailed natural language description (600-1000 words) that tells EVERYTHING about this user. This should be a complete portrait of who they are. Include: their complete personality profile, their work style in detail, their communication style, their learning preferences, their values and priorities, their thinking patterns, their cognitive style, their technology preferences, their lifestyle patterns, their interests and passions, their skills and expertise, their profession and career, their background, their motivations, their goals, their preferences across all domains, and what makes them uniquely them. Write as if you're writing a comprehensive biography of someone you know intimately - be specific, personal, insightful, and comprehensive. Cover every aspect of their identity, preferences, and characteristics. This should be the definitive description of this person.",
  "dynamic_profile_json": {
    "recent_activities": ["recent activities and behaviors - be comprehensive"],
    "current_projects": ["active projects or initiatives - be detailed"],
    "temporary_interests": ["temporary or emerging interests - be specific"],
    "recent_changes": ["recent life or work changes - be detailed"],
    "current_context": ["current situational context - be comprehensive"],
    "active_goals": ["goals they're actively pursuing - be specific"],
    "current_challenges": ["challenges they're facing - be detailed"],
    "recent_achievements": ["recent accomplishments or milestones - be specific"],
    "current_focus_areas": ["what they're currently focusing on - be comprehensive"],
    "emotional_state": {
      "current_concerns": ["current worries or concerns - be specific"],
      "current_excitements": ["what they're excited about - be detailed"],
      "stress_level": "high, medium, low, or inferred level - be specific"
    },
    "active_research_topics": ["topics they're actively researching - be comprehensive"],
    "upcoming_events": ["upcoming events or deadlines - be specific"]
  },
  "dynamic_profile_text": "A detailed, comprehensive natural language description (400-700 words) of their current state, recent changes, active goals, challenges, emotional state, and what's happening in their life right now. This should paint a complete picture of where they are in their journey. Include: their current activities, their active projects, their current goals, their current challenges, their recent achievements, their current focus areas, their emotional state, their current concerns and excitements, their active research, their upcoming events, recent changes in their life, and how all of this relates to their overall profile. Be specific, personal, and comprehensive. This should tell the complete story of their current moment."
}

Deep Analysis Guidelines - Be COMPREHENSIVE:
- Go DEEP beyond surface-level facts - understand their complete personality, motivations, and unique characteristics
- Extract EVERYTHING you can learn about them - their preferences, behaviors, patterns, values, goals, fears, hopes
- Infer work style from when and how they engage with content - be specific about timing, patterns, intensity
- Understand their thinking patterns from the types of content they consume - what does this reveal about how they think?
- Identify their values from what they prioritize and focus on - what truly matters to them?
- Recognize their communication style from the language and topics they engage with - how do they express themselves?
- Understand their learning preferences from how they consume information - how do they learn best?
- Identify ALL patterns in their behavior, interests, and focus areas - what patterns emerge?
- Be EXTREMELY specific and personal - avoid ANY generic statements
- Only include information that can be reasonably inferred from the memories, but be comprehensive in what you infer
- For personality traits: Are they analytical? Creative? Methodical? Spontaneous? Detail-oriented? Big-picture? Introverted? Extroverted? Practical? Theoretical? Optimistic? Pessimistic? Risk-taking? Cautious? Be comprehensive.
- For work style: When do they work? How do they approach tasks? Do they prefer structure or flexibility? How do they handle deadlines? How do they collaborate? Be detailed.
- For values: What do they prioritize? What matters to them? What drives their decisions? What are they willing to sacrifice? What are they not willing to compromise on? Be comprehensive.
- For preferences: What do they prefer in tools? In communication? In learning? In work? In life? Be comprehensive across all domains.
- Think about their complete identity - professional, personal, intellectual, emotional, social, creative, practical
- Consider their complete journey - where they've been, where they are, where they're going
- Think about their complete context - their environment, their relationships, their constraints, their opportunities

CRITICAL: The personal_narrative section (WHO, WHY, WHAT, HOW) is ESSENTIAL. Make it:
- EXTREMELY comprehensive - tell the complete story of who they are
- Deeply personal and specific to this individual - no generic statements
- Rich in detail that helps understand their unique perspective - include specific examples and patterns
- Written in a way that helps connect new memories to their identity - make it actionable
- Comprehensive enough to provide complete context for why certain memories matter to them
- Focused on making the user completely relatable and understandable as a unique person
- Long enough to tell the complete story - don't be brief, be comprehensive

CRITICAL: The static_profile_text should be a COMPLETE portrait. It should:
- Tell EVERYTHING about the user - be comprehensive
- Include ALL their preferences across all domains
- Be detailed enough that someone reading it would feel they know this person
- Cover personality, work style, communication, learning, values, thinking, technology, lifestyle, interests, skills, profession, background, motivations, goals
- Be specific and personal - no generic statements
- Be long enough to be comprehensive (600-1000 words)

CRITICAL: The dynamic_profile_text should paint a COMPLETE picture of their current state:
- Include everything about where they are right now
- Connect current state to their overall profile
- Be comprehensive about their current activities, goals, challenges, emotional state
- Be specific and personal
- Be long enough to be comprehensive (400-700 words)

Memory Context:
${memoryContext}

Return ONLY the JSON object:`
  }
}

export const extractionPromptBuilderService = new ExtractionPromptBuilderService()
