import { Router } from 'express'
import { DataController } from '../controller/data/data.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.get('/', authenticateToken, DataController.exportUserData)
router.post('/', authenticateToken, DataController.importUserData)

export default router
