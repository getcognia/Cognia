import { Prisma } from '@prisma/client'

export type MemoryWithMetadata = Prisma.MemoryGetPayload<{
  select: {
    id: true
    title: true
    content: true
    canonical_text: true
    url: true
    created_at: true
    page_metadata: true
    user_id: true
    timestamp: true
    source: true
    importance_score: true
  }
}>

export type MemoryRelation = {
  memory: MemoryWithMetadata
  similarity: number
  similarity_score?: number
  relation_type?: string
  id?: string
}

export type MemoryEdge = {
  source: string
  target: string
  similarity_score: number
  relationship_type?: string
}

export type QdrantFilter = {
  must: Array<{
    key: string
    match: { value?: string | string[]; any?: string[] }
  }>
  must_not?: Array<{
    key: string
    match: { value?: string | string[]; any?: string[] }
  }>
}

export type RelationshipEvaluation = {
  isRelevant: boolean
  relevanceScore: number
  relationshipType: string
  reasoning: string
}

export type BatchData = {
  memoryB: {
    id: string
    title: string
    preview: string
    topics?: string[]
    categories?: string[]
  }
}

export type CachedEvaluation = {
  evaluation: RelationshipEvaluation
  timestamp: number
}
