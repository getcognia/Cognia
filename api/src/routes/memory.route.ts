import { Router } from 'express'
import { MemoryController } from '../controller/memory/memory.controller'
import { MemoryMeshController } from '../controller/memory/memory-mesh.controller'
import { DataController } from '../controller/data/data.controller'
import { AnalyticsController } from '../controller/analytics/analytics.controller'
import { ContentController } from '../controller/content/content.controller'
import { SearchController } from '../controller/search/search.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.post('/process', authenticateToken, ContentController.submitContent)
router.get('/user/count', authenticateToken, MemoryController.getUserMemoryCount)
router.get('/user/recent', authenticateToken, MemoryController.getRecentMemories)
router.get('/search', authenticateToken, SearchController.searchMemories)
router.get('/analytics', authenticateToken, AnalyticsController.getAnalytics)
router.get('/mesh', authenticateToken, MemoryMeshController.getMemoryMesh)
router.get('/relations/:memoryId', authenticateToken, MemoryMeshController.getMemoryWithRelations)
router.get('/cluster/:memoryId', authenticateToken, MemoryMeshController.getMemoryCluster)
router.get('/search-embeddings', authenticateToken, SearchController.searchMemoriesWithEmbeddings)
router.get('/search-hybrid', authenticateToken, SearchController.searchMemoriesHybrid)
router.post('/process-mesh/:memoryId', authenticateToken, MemoryMeshController.processMemoryForMesh)
router.get('/snapshots', authenticateToken, DataController.getMemorySnapshots)
router.get('/snapshot/:snapshotId', authenticateToken, DataController.getMemorySnapshot)
router.post('/backfill-snapshots', authenticateToken, DataController.backfillMemorySnapshots)
router.get('/health', MemoryController.healthCheck)
router.get('/debug', authenticateToken, MemoryController.debugMemories)
router.delete('/:memoryId', authenticateToken, MemoryController.deleteMemory)
router.post('/:memoryId/redact', authenticateToken, MemoryController.redactMemory)
router.post('/redact-domain', authenticateToken, MemoryController.redactDomainMemories)

export default router
