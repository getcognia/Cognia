import { GoogleGenAI } from '@google/genai'
import { GEMINI_EMBED_MODEL } from './gemini.service'
import { runWithRateLimit } from './gemini-rate-limiter.service'
import type { GeminiResponse } from '../../types/ai.types'

export class GeminiEmbeddingService {
  constructor(private ai: GoogleGenAI | null) {}

  async generateEmbedding(text: string): Promise<{
    embedding: number[]
    modelUsed?: string
    inputTokens?: number
    outputTokens?: number
  }> {
    if (!this.ai) throw new Error('Gemini service not initialized. Set GEMINI_API_KEY.')

    const response = await runWithRateLimit(
      () =>
        this.ai!.models.embedContent({
          model: GEMINI_EMBED_MODEL,
          contents: text,
        }),
      180000,
      true
    )
    const values = response.embeddings?.[0]?.values
    if (!values) throw new Error('No embedding generated from Gemini API')

    const usageMetadata = (response as GeminiResponse).usageMetadata
    const inputTokens = usageMetadata?.promptTokenCount || 0
    const outputTokens = 0
    const modelUsed = GEMINI_EMBED_MODEL

    return { embedding: values, modelUsed, inputTokens, outputTokens }
  }
}
