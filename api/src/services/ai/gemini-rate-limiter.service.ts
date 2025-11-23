import type { QueueTask, QueuedTask, GeminiError } from '../../types/ai.types'

let isProcessingQueue = false
let nextAvailableAt = 0
const taskQueue: QueuedTask[] = []

const minIntervalMs = 6000

export async function processQueue() {
  if (isProcessingQueue) return
  isProcessingQueue = true
  try {
    while (taskQueue.length > 0) {
      taskQueue.sort((a, b) => b.priority - a.priority)

      const now = Date.now()
      const waitMs = Math.max(0, nextAvailableAt - now)
      if (waitMs > 0) {
        await new Promise(r => setTimeout(r, waitMs))
      }

      const { run, resolve, reject } = taskQueue.shift()!
      try {
        const result = await run()
        resolve(result)
        nextAvailableAt = Date.now() + minIntervalMs
      } catch (err) {
        const error = err as Error | GeminiError
        const retryDelayMs = extractRetryDelayMs(error) ?? minIntervalMs
        nextAvailableAt = Date.now() + retryDelayMs
        reject(error)
      }
    }
  } finally {
    isProcessingQueue = false
  }
}

function extractRetryDelayMs(err: Error | GeminiError): number | null {
  const error = err as GeminiError
  const details = error?.details
  if (Array.isArray(details)) {
    for (const d of details) {
      if (typeof d?.retryDelay === 'string') {
        const m = d.retryDelay.match(/^(\d+)(?:\.(\d+))?s$/)
        if (m) {
          const seconds = Number(m[1])
          const frac = m[2] ? Number(`0.${m[2]}`) : 0
          return Math.max(Math.floor((seconds + frac) * 1000), 1000)
        }
      }
    }
  }
  const msg: string | undefined = error?.message
  if (msg) {
    const m = msg.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i)
    if (m) return Math.max(Math.floor(parseFloat(m[1]) * 1000), 1000)
  }
  if (error?.status === 429) return 8000
  return null
}

export function runWithRateLimit<T>(
  task: QueueTask<T>,
  timeoutMs: number = 60000,
  bypassRateLimit: boolean = false,
  priority: number = 0
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    const executeTask = async () => {
      try {
        const result = await task()
        clearTimeout(timeoutId)
        return result
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    }

    if (bypassRateLimit) {
      executeTask().then(resolve).catch(reject)
    } else {
      taskQueue.push({
        run: executeTask,
        resolve,
        reject,
        priority,
      })
      processQueue()
    }
  })
}
