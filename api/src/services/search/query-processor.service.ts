import crypto from 'crypto'

export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/[?!.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)
}

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2)
    .filter(token => !STOP_WORDS.has(token))
}

export type QueryAnalysis = {
  queryType: 'specific' | 'general' | 'temporal' | 'exploratory'
  specificity: number
  temporalIndicators: boolean
  keywordDensity: number
  estimatedMemoryAge: 'recent' | 'medium' | 'old' | 'any'
  requiresDeepSearch: boolean
}

export function analyzeQuery(query: string, userMemoryCount: number): QueryAnalysis {
  const normalized = query.toLowerCase()
  const tokens = tokenizeQuery(query)
  const queryLength = query.length
  const tokenCount = tokens.length

  const temporalKeywords = [
    'yesterday',
    'today',
    'last week',
    'last month',
    'last year',
    'years ago',
    'recent',
    'old',
    'ancient',
    'when',
    'ago',
  ]
  const hasTemporalIndicators = temporalKeywords.some(keyword => normalized.includes(keyword))

  const specificIndicators = [
    'what',
    'who',
    'where',
    'when',
    'how',
    'why',
    'which',
    'name',
    'list',
    'show',
  ]
  const hasSpecificIndicators = specificIndicators.some(indicator => normalized.includes(indicator))

  const specificity = Math.min(
    1,
    (hasSpecificIndicators ? 0.3 : 0) +
      (tokenCount > 5 ? 0.2 : tokenCount > 3 ? 0.1 : 0) +
      (queryLength > 50 ? 0.2 : queryLength > 20 ? 0.1 : 0) +
      (tokens.length / Math.max(1, normalized.split(/\s+/).length)) * 0.3
  )

  let queryType: QueryAnalysis['queryType'] = 'general'
  if (hasTemporalIndicators) {
    queryType = 'temporal'
  } else if (specificity > 0.6) {
    queryType = 'specific'
  } else if (specificity < 0.3) {
    queryType = 'exploratory'
  }

  let estimatedMemoryAge: QueryAnalysis['estimatedMemoryAge'] = 'any'
  if (
    normalized.includes('years ago') ||
    normalized.includes('old') ||
    normalized.includes('ancient')
  ) {
    estimatedMemoryAge = 'old'
  } else if (
    normalized.includes('recent') ||
    normalized.includes('last week') ||
    normalized.includes('last month')
  ) {
    estimatedMemoryAge = 'recent'
  } else if (normalized.includes('last year')) {
    estimatedMemoryAge = 'medium'
  }

  const requiresDeepSearch =
    estimatedMemoryAge === 'old' ||
    specificity < 0.4 ||
    userMemoryCount > 1000 ||
    queryType === 'exploratory'

  const keywordDensity = tokenCount / Math.max(1, normalized.split(/\s+/).length)

  return {
    queryType,
    specificity,
    temporalIndicators: hasTemporalIndicators,
    keywordDensity,
    estimatedMemoryAge,
    requiresDeepSearch,
  }
}

export type DynamicSearchParams = {
  qdrantLimit: number
  semanticThreshold: number
  keywordThreshold: number
  coverageThreshold: number
  minScore: number
  searchStrategy: 'narrow' | 'balanced' | 'broad'
  maxResults: number
}

export function calculateDynamicSearchParams(
  analysis: QueryAnalysis,
  userMemoryCount: number,
  requestedLimit?: number
): DynamicSearchParams {
  const baseLimit = requestedLimit || Number(process.env.SEARCH_TOP_K || 50)
  const maxLimit = Number(process.env.SEARCH_MAX_LIMIT || 1000)
  const effectiveLimit = Math.min(baseLimit, maxLimit)

  let searchStrategy: 'narrow' | 'balanced' | 'broad' = 'balanced'
  let qdrantLimit: number
  let semanticThreshold: number
  let keywordThreshold: number
  let coverageThreshold: number
  let minScore: number

  if (analysis.requiresDeepSearch || analysis.estimatedMemoryAge === 'old') {
    searchStrategy = 'broad'
    qdrantLimit = Math.min(effectiveLimit * 10, Math.max(500, userMemoryCount * 0.5))
    semanticThreshold = 0.1
    keywordThreshold = 0.2
    coverageThreshold = 0.3
    minScore = 0.1
  } else if (analysis.specificity > 0.7) {
    searchStrategy = 'narrow'
    qdrantLimit = effectiveLimit * 2
    semanticThreshold = 0.2
    keywordThreshold = 0.4
    coverageThreshold = 0.6
    minScore = 0.2
  } else {
    searchStrategy = 'balanced'
    qdrantLimit = effectiveLimit * 3
    semanticThreshold = 0.15
    keywordThreshold = 0.3
    coverageThreshold = 0.5
    minScore = 0.15
  }

  if (userMemoryCount > 5000) {
    qdrantLimit = Math.min(qdrantLimit * 1.5, userMemoryCount * 0.3)
  } else if (userMemoryCount < 100) {
    qdrantLimit = Math.min(qdrantLimit, userMemoryCount)
  }

  if (analysis.keywordDensity > 0.7) {
    keywordThreshold *= 0.8
    semanticThreshold *= 1.1
  } else if (analysis.keywordDensity < 0.3) {
    semanticThreshold *= 0.8
    keywordThreshold *= 1.2
  }

  return {
    qdrantLimit: Math.max(effectiveLimit, Math.min(qdrantLimit, 10000)),
    semanticThreshold,
    keywordThreshold,
    coverageThreshold,
    minScore,
    searchStrategy,
    maxResults: effectiveLimit,
  }
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

export function extractCitationOrder(text?: string): number[] {
  if (!text) return []
  const order: number[] = []
  const seen = new Set<number>()
  const re = /\[([\d,\s]+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const numbers = m[1]
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => !Number.isNaN(n))
    for (const n of numbers) {
      if (!seen.has(n)) {
        seen.add(n)
        order.push(n)
      }
    }
  }
  return order
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
  'the',
  'this',
  'but',
  'they',
  'have',
  'had',
  'what',
  'when',
  'where',
  'who',
  'which',
  'why',
  'how',
])
