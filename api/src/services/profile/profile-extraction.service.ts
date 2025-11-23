import { aiProvider } from '../ai/ai-provider.service'
import { logger } from '../../utils/core/logger.util'
import { Prisma } from '@prisma/client'
import type { ProfileExtractionResult } from '../../types/profile.types'
import { extractionPromptBuilderService } from './extraction-prompt-builder.service'
import { profileParserService } from './profile-parser.service'
import { profileFallbackService } from './profile-fallback.service'

export type {
  StaticProfile,
  DynamicProfile,
  ProfileExtractionResult,
} from '../../types/profile.types'

export class ProfileExtractionService {
  async extractProfileFromMemories(
    userId: string,
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
  ): Promise<ProfileExtractionResult> {
    if (memories.length === 0) {
      return profileFallbackService.getEmptyProfile()
    }

    const memoryContext = extractionPromptBuilderService.prepareMemoryContext(
      memories,
      existingProfile
    )
    const prompt = extractionPromptBuilderService.buildExtractionPrompt(
      memoryContext,
      existingProfile
    )

    try {
      const response = await aiProvider.generateContent(prompt, false, userId)
      const parsed = profileParserService.parseProfileResponse(response)
      return { ...parsed, isFallback: false }
    } catch (error) {
      logger.error('Error extracting profile from memories, retrying once:', error)

      try {
        const retryResponse = await aiProvider.generateContent(prompt, false, userId)
        const retryParsed = profileParserService.parseProfileResponse(retryResponse)
        logger.log('Profile extraction succeeded on retry')
        return { ...retryParsed, isFallback: false }
      } catch (retryError) {
        logger.error('Error extracting profile from memories on retry, using fallback:', {
          error: retryError instanceof Error ? retryError.message : String(retryError),
          stack: retryError instanceof Error ? retryError.stack : undefined,
        })
        const fallbackResult = profileFallbackService.extractProfileFallback(memories)
        logger.log('Using fallback profile extraction', {
          hasStatic: !!fallbackResult.static_profile_json,
          hasDynamic: !!fallbackResult.dynamic_profile_json,
        })
        return { ...fallbackResult, isFallback: true }
      }
    }
  }
}

export const profileExtractionService = new ProfileExtractionService()
