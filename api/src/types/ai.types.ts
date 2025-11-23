export type UsageMetadata = {
  promptTokenCount?: number
  candidatesTokenCount?: number
}

export type GeminiResponse = {
  text: string
  usageMetadata?: UsageMetadata
}

export type GeminiError = {
  status?: number
  message?: string
  details?: Array<{
    retryDelay?: string
    [key: string]: unknown
  }>
}

export type ContentMetadata = {
  content_type?: string
  title?: string
  url?: string
  content_summary?: string
  key_topics?: string[]
}

export type QueueTask<T> = () => Promise<T>
export type QueuedTask<T = unknown> = {
  run: QueueTask<T>
  resolve: (v: T) => void
  reject: (e: Error | GeminiError) => void
  priority: number
}
