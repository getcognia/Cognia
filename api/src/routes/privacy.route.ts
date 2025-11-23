import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import { DataController } from '../controller/data/data.controller'

const router = Router()

router.get('/audit-logs', authenticateToken, DataController.getAuditLogs)

export default router
