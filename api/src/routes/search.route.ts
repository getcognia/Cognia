import { Router } from 'express'
import { SearchController } from '../controller/search/search.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.post('/', authenticateToken, SearchController.postSearch)
router.post('/context', authenticateToken, SearchController.getContext)
router.get('/job/:id', SearchController.getSearchJobStatus)

export default router
