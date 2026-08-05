import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../infrastructure/logger/logger.js';
import { ApiResponse } from '../../../common/responses/api-response.js';
import { documentService } from './dependencies.js';

export class ReprocessDocumentController {
  /**
   * POST /api/v1/documents/:id/reprocess
   * Manually triggers reprocessing of a document.
   */
  public async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      logger.info(
        { userId, documentId: id },
        'Incoming Request: POST /api/v1/documents/:id/reprocess',
      );

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const document = await documentService.reprocessDocument(id, userId);

      logger.info(
        { userId, documentId: id },
        'Successful Response: Reprocessing initiated successfully',
      );

      ApiResponse.success(res, document, 'Reprocessing initiated successfully');
    } catch (error) {
      logger.error(
        { error, documentId: req.params.id, userId: req.user?.id },
        'Controller Error: Reprocess document failed',
      );
      next(error);
    }
  }
}
