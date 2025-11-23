import type { ProfileExtractionResult } from '../../types/profile.types'
import { Prisma } from '@prisma/client'

export class ProfileValidatorService {
  validateProfileExtraction(result: ProfileExtractionResult): boolean {
    if (!result.static_profile_json || !result.dynamic_profile_json) {
      return false
    }

    const staticProfile = result.static_profile_json
    const dynamicProfile = result.dynamic_profile_json

    if (typeof staticProfile !== 'object' || Array.isArray(staticProfile)) {
      return false
    }

    if (typeof dynamicProfile !== 'object' || Array.isArray(dynamicProfile)) {
      return false
    }

    return true
  }

  validateProfileMerge(
    existing: {
      static_profile_json?: Prisma.JsonValue
      dynamic_profile_json?: Prisma.JsonValue
      static_profile_text?: string | null
      dynamic_profile_text?: string | null
    },
    newExtraction: ProfileExtractionResult
  ): boolean {
    if (!this.validateProfileExtraction(newExtraction)) {
      return false
    }

    if (existing.static_profile_json && typeof existing.static_profile_json !== 'object') {
      return false
    }

    if (existing.dynamic_profile_json && typeof existing.dynamic_profile_json !== 'object') {
      return false
    }

    return true
  }

  mergeArrays(existing: string[], newItems: string[]): string[] {
    const merged = new Set([...existing, ...newItems])
    return Array.from(merged).slice(0, 20)
  }
}

export const profileValidatorService = new ProfileValidatorService()
