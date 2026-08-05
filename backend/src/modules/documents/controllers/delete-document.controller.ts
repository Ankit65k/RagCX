import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../infrastructure/logger/logger.js';
import { ApiResponse } from '../../../common/responses/api-response.js';
import { documentService } from './dependencies.js';

export class DeleteDocumentController {
  /**
   * DELETE /api/v1/documents/:id
   * Soft deletes a document by moving the status to DELETED and removing the file.
   */
  public async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      logger.info(
        { userId, documentId: id },
        'Incoming Request: DELETE /api/v1/documents/:id',
      );

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await documentService.deleteDocument(id, userId);

      logger.info(
        { userId, documentId: id },
        'Successful Response: Document deleted successfully',
      );

      ApiResponse.success(res, null, 'Document deleted successfully');
    } catch (error) {
      logger.error(
        { error, documentId: req.params.id, userId: req.user?.id },
        'Controller Error: Delete document failed',
      );
      next(error);
    }
  }
}
