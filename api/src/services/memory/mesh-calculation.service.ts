import { UMAP } from 'umap-js'
import { qdrantClient, COLLECTION_NAME, ensureCollection } from '../../lib/qdrant.lib'
import { logger } from '../../utils/core/logger.util'
import { Prisma } from '@prisma/client'

type MemoryWithMetadata = Prisma.MemoryGetPayload<{
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

type MemoryEdge = {
  source: string
  target: string
  similarity_score: number
  relationship_type?: string
}

type QdrantFilter = {
  must: Array<{
    key: string
    match: { value?: string | string[]; any?: string[] }
  }>
  must_not?: Array<{
    key: string
    match: { value?: string | string[]; any?: string[] }
  }>
}

export class MeshCalculationService {
  async computeLatentSpaceProjection(
    memories: MemoryWithMetadata[]
  ): Promise<Map<string, { x: number; y: number; z: number }>> {
    try {
      await ensureCollection()

      if (memories.length < 3) {
        return new Map()
      }

      const memoryIds = memories.map(m => m.id)
      const userId = memories.length > 0 ? memories[0].user_id : undefined

      const filter: QdrantFilter = {
        must: [
          { key: 'memory_id', match: { any: memoryIds } },
          { key: 'embedding_type', match: { value: 'content' } },
        ],
      }

      if (userId) {
        filter.must.push({ key: 'user_id', match: { value: userId } })
      }

      const embeddingResult = await qdrantClient.scroll(COLLECTION_NAME, {
        filter,
        limit: memoryIds.length * 3,
        with_payload: true,
        with_vector: true,
      })

      if (!embeddingResult.points || embeddingResult.points.length < 3) {
        return new Map()
      }

      let embeddingData: { id: string; vector: number[] }[] = []
      for (const point of embeddingResult.points) {
        const memoryId = point.payload?.memory_id as string
        if (memoryId && point.vector && Array.isArray(point.vector)) {
          embeddingData.push({ id: memoryId, vector: point.vector as number[] })
        }
      }

      if (embeddingData.length < 3) {
        return new Map()
      }

      embeddingData = embeddingData.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

      const embeddingMatrix = embeddingData.map(e => e.vector)

      const makeSeed = (ids: string[]): number => {
        let h = 2166136261
        for (const id of ids) {
          for (let i = 0; i < id.length; i++) {
            h ^= id.charCodeAt(i)
            h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
          }
        }
        return h >>> 0
      }
      const mulberry32 = (seed: number) => () => {
        let t = (seed += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
      const seededRandom = mulberry32(makeSeed(embeddingData.map(e => e.id)))

      const datasetSize = embeddingMatrix.length
      let nEpochs = 50
      if (datasetSize > 2000) {
        nEpochs = 30
      } else if (datasetSize > 1000) {
        nEpochs = 50
      } else if (datasetSize > 500) {
        nEpochs = 75
      } else if (datasetSize > 200) {
        nEpochs = 100
      }

      const umap = new UMAP({
        nComponents: 3,
        nEpochs: nEpochs,
        nNeighbors: Math.min(10, Math.max(3, Math.floor(Math.sqrt(datasetSize)))),
        minDist: 0.1,
        spread: 1.5,
        random: seededRandom,
      })

      const projection = umap.fit(embeddingMatrix)

      let xMin = Infinity
      let xMax = -Infinity
      let yMin = Infinity
      let yMax = -Infinity
      let zMin = Infinity
      let zMax = -Infinity

      const coords = projection.map(p => {
        const x = p[0]
        const y = p[1]
        const z = p[2] ?? 0
        xMin = Math.min(xMin, x)
        xMax = Math.max(xMax, x)
        yMin = Math.min(yMin, y)
        yMax = Math.max(yMax, y)
        zMin = Math.min(zMin, z)
        zMax = Math.max(zMax, z)
        return { x, y, z }
      })

      const scale = 1200
      const xSpan = xMax - xMin || 1
      const ySpan = yMax - yMin || 1
      const zSpan = zMax - zMin || 1

      const normalized = coords.map(c => ({
        x: ((c.x - xMin) / xSpan - 0.5) * scale,
        y: ((c.y - yMin) / ySpan - 0.5) * scale,
        z: ((c.z - zMin) / zSpan - 0.5) * (scale * 0.6),
      }))

      const coordMap = new Map<string, { x: number; y: number; z: number }>()
      embeddingData.forEach((data, index) => {
        coordMap.set(data.id, normalized[index])
      })

      return coordMap
    } catch (error) {
      logger.error('Error computing latent space projection:', error)
      return new Map()
    }
  }

  applyForceDirectedLayout(
    nodes: Array<{ id: string; x: number; y: number; z?: number }>,
    edges: MemoryEdge[]
  ): Array<{ id: string; x: number; y: number; z?: number }> {
    const iterations = 150
    const k = 400
    const c = 0.008
    const maxForce = 50

    const forces = new Map<string, { x: number; y: number }>()
    nodes.forEach(node => {
      forces.set(node.id, { x: 0, y: 0 })
    })

    for (let iter = 0; iter < iterations; iter++) {
      forces.forEach(force => {
        force.x = 0
        force.y = 0
      })

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i]
          const nodeB = nodes[j]
          const dx = nodeA.x - nodeB.x
          const dy = nodeA.y - nodeB.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1

          const force = Math.min((k * k) / (distance * 1.5), maxForce)
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force

          forces.get(nodeA.id)!.x += fx
          forces.get(nodeA.id)!.y += fy
          forces.get(nodeB.id)!.x -= fx
          forces.get(nodeB.id)!.y -= fy
        }
      }

      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x
          const dy = targetNode.y - sourceNode.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1

          const force = Math.min((distance * distance) / (k * 0.8), maxForce)
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force

          forces.get(sourceNode.id)!.x += fx
          forces.get(sourceNode.id)!.y += fy
          forces.get(targetNode.id)!.x -= fx
          forces.get(targetNode.id)!.y -= fy
        }
      })

      const adaptiveDamping = c * (1 - iter / iterations)
      nodes.forEach(node => {
        const force = forces.get(node.id)!
        node.x += Math.max(-maxForce, Math.min(maxForce, force.x)) * adaptiveDamping
        node.y += Math.max(-maxForce, Math.min(maxForce, force.y)) * adaptiveDamping

        const maxX = 1200
        const maxY = 800
        node.x = Math.max(-maxX, Math.min(maxX, node.x))
        node.y = Math.max(-maxY, Math.min(maxY, node.y))
      })
    }

    return nodes
  }

  getSourceOffset(source: string): { x: number; y: number } {
    const offsets: { [key: string]: { x: number; y: number } } = {
      extension: { x: -300, y: -200 },
      github: { x: 200, y: -100 },
      meet: { x: -200, y: 300 },
      default: { x: 0, y: 0 },
    }

    return offsets[source] || offsets.default
  }

  pruneEdgesMutualKNN(edges: MemoryEdge[], k: number, similarityThreshold: number): MemoryEdge[] {
    type WeightedEdge = MemoryEdge & { weighted: number }
    const bySource = new Map<string, WeightedEdge[]>()
    const edgeMap = new Map<string, MemoryEdge>()

    const weightForType: Record<string, number> = {
      semantic: 0.05,
      topical: 0.02,
      temporal: 0,
    }

    const keyFor = (a: string, b: string) => (a < b ? `${a}__${b}` : `${b}__${a}`)

    edges.forEach((e: MemoryEdge) => {
      if (e.source === e.target) return
      const weighted = (e.similarity_score || 0) + (weightForType[e.relationship_type || ''] || 0)
      if (weighted < similarityThreshold) return

      if (!bySource.has(e.source)) bySource.set(e.source, [])
      if (!bySource.has(e.target)) bySource.set(e.target, [])

      bySource.get(e.source)!.push({ ...e, weighted })
      bySource.get(e.target)!.push({ ...e, source: e.target, target: e.source, weighted })

      edgeMap.set(keyFor(e.source, e.target), e)
    })

    const topKPerNode = new Map<string, Set<string>>()
    for (const [node, list] of bySource.entries()) {
      const top = list
        .sort((a, b) => b.weighted - a.weighted)
        .slice(0, k)
        .map(e => e.target)
      topKPerNode.set(node, new Set(top))
    }

    const kept = new Map<string, MemoryEdge>()
    for (const e of edges) {
      if (e.source === e.target) continue
      const aTop = topKPerNode.get(e.source)
      const bTop = topKPerNode.get(e.target)
      if (!aTop || !bTop) continue
      if (!aTop.has(e.target) || !bTop.has(e.source)) continue
      const kkey = keyFor(e.source, e.target)
      const existing = kept.get(kkey)
      if (!existing || (e.similarity_score || 0) > (existing.similarity_score || 0)) {
        kept.set(kkey, e)
      }
    }

    const degreeCap = Math.max(2, Math.min(5, k + 1))
    const degree = new Map<string, number>()
    const finalEdges: MemoryEdge[] = []
    const sorted = Array.from(kept.values()).sort(
      (a, b) => (b.similarity_score || 0) - (a.similarity_score || 0)
    )

    for (const e of sorted) {
      const da = degree.get(e.source) || 0
      const db = degree.get(e.target) || 0
      if (da >= degreeCap || db >= degreeCap) continue
      finalEdges.push(e)
      degree.set(e.source, da + 1)
      degree.set(e.target, db + 1)
    }

    return finalEdges
  }
}

export const meshCalculationService = new MeshCalculationService()
