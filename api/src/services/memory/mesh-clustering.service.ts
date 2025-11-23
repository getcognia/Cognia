import { prisma } from '../../lib/prisma.lib'
import { logger } from '../../utils/core/logger.util'
import type { MemoryWithMetadata, MemoryEdge } from '../../types/memory.types'

type ClusterMemory = MemoryWithMetadata & {
  depth: number
  relation_count: number
  related_memories?: Array<{
    related_memory: {
      id: string
      title: string | null
      url: string | null
      created_at: Date
    }
    similarity_score: number
    relation_type: string | null
  }>
}

export class MeshClusteringService {
  async getMemoryCluster(
    userId: string,
    centerMemoryId: string,
    depth: number = 2
  ): Promise<{ memories: MemoryWithMetadata[]; relations: MemoryEdge[] }> {
    try {
      const visited = new Set<string>()
      const cluster = new Map<string, ClusterMemory>()

      const processMemory = async (memoryId: string, currentDepth: number) => {
        if (currentDepth > depth || visited.has(memoryId)) {
          return
        }

        visited.add(memoryId)

        const memory = await prisma.memory.findUnique({
          where: { id: memoryId },
          include: {
            related_memories: {
              include: {
                related_memory: {
                  select: {
                    id: true,
                    title: true,
                    url: true,
                    created_at: true,
                  },
                },
              },
              orderBy: { similarity_score: 'desc' },
              take: 5,
            },
          },
        })

        if (memory) {
          cluster.set(memoryId, {
            ...memory,
            depth: currentDepth,
            relation_count: memory.related_memories.length,
          })

          for (const relation of memory.related_memories) {
            if (relation.similarity_score > 0.3) {
              await processMemory(relation.related_memory.id, currentDepth + 1)
            }
          }
        }
      }

      await processMemory(centerMemoryId, 0)

      const memories: MemoryWithMetadata[] = Array.from(cluster.values()).map(m => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { depth, relation_count, related_memories, ...memory } = m
        return memory as MemoryWithMetadata
      })
      const relations: MemoryEdge[] = []

      for (const memory of cluster.values()) {
        if (memory.related_memories) {
          for (const rel of memory.related_memories) {
            if (rel.similarity_score > 0.3) {
              relations.push({
                source: memory.id,
                target: rel.related_memory.id,
                similarity_score: rel.similarity_score,
                relationship_type: rel.relation_type,
              })
            }
          }
        }
      }

      return {
        memories,
        relations,
      }
    } catch (error) {
      logger.error(`Error getting memory cluster for ${centerMemoryId}:`, error)
      throw error
    }
  }
}

export const meshClusteringService = new MeshClusteringService()
