import { Response } from 'express'
import { AuthenticatedRequest } from '../../middleware/auth.middleware'
import { SearchEndpointsController } from './search-endpoints.controller'

export class MemorySearchController {
  static async searchMemories(req: AuthenticatedRequest, res: Response) {
    return SearchEndpointsController.searchMemories(req, res)
  }

  static async searchMemoriesWithEmbeddings(req: AuthenticatedRequest, res: Response) {
    return SearchEndpointsController.searchMemoriesWithEmbeddings(req, res)
  }

  static async searchMemoriesHybrid(req: AuthenticatedRequest, res: Response) {
    return SearchEndpointsController.searchMemoriesHybrid(req, res)
  }
}
