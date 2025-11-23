import fetch from 'node-fetch'
import { geminiService } from './gemini.service'
import { tokenTracking } from '../core/token-tracking.service'

type Provider = 'gemini' | 'ollama' | 'hybrid'

const genProvider: Provider =
  (process.env.GEN_PROVIDER as Provider) || (process.env.AI_PROVIDER as Provider) || 'hybrid'
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_GEN_MODEL = process.env.OLLAMA_GEN_MODEL || 'llama3.1:8b'

export class GenerationProviderService {
  async generateContent(
    prompt: string,
    isSearchRequest: boolean = false,
    userId?: string,
    timeoutOverride?: number,
    isEmailDraft: boolean = false
  ): Promise<string> {
    let result: string
    let modelUsed: string | undefined

    if (genProvider === 'gemini') {
      const response = await geminiService.generateContent(
        prompt,
        isSearchRequest,
        timeoutOverride,
        isEmailDraft
      )
      result = response.text
      modelUsed = response.modelUsed
    } else {
      const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_GEN_MODEL,
          prompt,
          stream: false,
          options: { num_predict: 128, temperature: 0.3 },
        }),
      })
      if (!res.ok) throw new Error(`Ollama generate failed: ${res.status}`)
      type OllamaResponse = { response?: string; text?: string }
      const data = (await res.json()) as OllamaResponse
      result = data?.response || data?.text || ''
      if (!result) throw new Error('No content from Ollama')
      modelUsed = OLLAMA_GEN_MODEL
    }

    if (userId) {
      const inputTokens = tokenTracking.estimateTokens(prompt)
      const outputTokens = tokenTracking.estimateTokens(result)
      await tokenTracking.recordTokenUsage({
        userId,
        operationType: isSearchRequest ? 'search' : 'generate_content',
        inputTokens,
        outputTokens,
        modelUsed,
      })
    }

    return result
  }
}

export const generationProviderService = new GenerationProviderService()
