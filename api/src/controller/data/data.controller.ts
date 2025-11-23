import { Response, NextFunction } from 'express'
import { AuthenticatedRequest } from '../../middleware/auth.middleware'
import { ExportImportController } from './export-import.controller'
import { MemorySnapshotController } from './memory-snapshot.controller'
import { PrivacyController } from './privacy.controller'

export class DataController {
  // Export/Import
  static async exportUserData(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    return ExportImportController.exportUserData(req, res, next)
  }

  static async importUserData(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    return ExportImportController.importUserData(req, res, next)
  }

  // Memory Snapshots
  static async getMemorySnapshots(req: AuthenticatedRequest, res: Response) {
    return MemorySnapshotController.getMemorySnapshots(req, res)
  }

  static async getMemorySnapshot(req: AuthenticatedRequest, res: Response) {
    return MemorySnapshotController.getMemorySnapshot(req, res)
  }

  static async backfillMemorySnapshots(req: AuthenticatedRequest, res: Response) {
    return MemorySnapshotController.backfillMemorySnapshots(req, res)
  }

  // Privacy
  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    return PrivacyController.getAuditLogs(req, res, next)
  }
}
