import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../../middleware/auth.middleware'
import { addContentJob, ContentJobData } from '../../lib/queue.lib'
import { prisma } from '../../lib/prisma.lib'
import AppError from '../../utils/http/app-error.util'
import { logger } from '../../utils/core/logger.util'
import { buildContentPreview } from '../../utils/text/text.util'

export class ContentController {
  static async submitContent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user_id = req.user!.id
      const raw_text = (req.body.raw_text || req.body.content || req.body.text) as
        | string
        | undefined
      const metadata = req.body.metadata as Record<string, unknown> | undefined

      if (!raw_text || typeof raw_text !== 'string' || raw_text.trim().length === 0) {
        return next(new AppError('raw_text, content, or text is required', 400))
      }

      const jobData: ContentJobData = {
        user_id,
        raw_text: raw_text.trim(),
        metadata: metadata || {},
      }

      await addContentJob(jobData)

      res.status(202).json({
        success: true,
        message: 'Content submitted for processing',
      })
    } catch (err) {
      next(err)
    }
  }

  static async getSummarizedContent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const limit = req.query.limit ? Number(req.query.limit) : 20
      const page = req.query.page ? Number(req.query.page) : 1
      const limitNum = Math.min(limit, 100)
      const skip = (page - 1) * limitNum

      const [memories, total] = await Promise.all([
        prisma.memory.findMany({
          where: { user_id: userId },
          select: {
            id: true,
            title: true,
            url: true,
            content: true,
            created_at: true,
            page_metadata: true,
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.memory.count({
          where: { user_id: userId },
        }),
      ])

      const summarized = memories.map(memory => ({
        id: memory.id,
        title: memory.title,
        url: memory.url,
        preview: buildContentPreview(memory.content),
        created_at: memory.created_at,
        metadata: memory.page_metadata,
      }))

      res.status(200).json({
        success: true,
        data: {
          memories: summarized,
          pagination: {
            page,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      })
    } catch (error) {
      logger.error('Error fetching summarized content:', error)
      next(error)
    }
  }
}
