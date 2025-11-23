import { Router } from 'express'

import { ContentController } from '../controller/content/content.controller'
import { EmailController } from '../controller/email/email.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.post('/', authenticateToken, ContentController.submitContent)
router.get('/user', authenticateToken, ContentController.getSummarizedContent)
router.post('/email/draft', authenticateToken, EmailController.draftEmailReply)

export default router
