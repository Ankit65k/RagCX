import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../infrastructure/logger/logger.js';
import { ApiResponse } from '../../../common/responses/api-response.js';
import { documentService } from './dependencies.js';

export class RestoreDocumentController {
  /**
   * POST /api/v1/documents/:id/restore
   * Restores a deleted document back to UPLOADED/PENDING state.
   */
  public async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      logger.info(
        { userId, documentId: id },
        'Incoming Request: POST /api/v1/documents/:id/restore',
      );

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const document = await documentService.restoreDocument(id, userId);

      logger.info(
        { userId, documentId: id },
        'Successful Response: Document restored successfully',
      );

      ApiResponse.success(res, document, 'Document restored successfully');
    } catch (error) {
      logger.error(
        { error, documentId: req.params.id, userId: req.user?.id },
        'Controller Error: Restore document failed',
      );
      next(error);
    }
  }
}
