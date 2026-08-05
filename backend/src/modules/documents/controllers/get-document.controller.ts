import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../infrastructure/logger/logger.js';
import { ApiResponse } from '../../../common/responses/api-response.js';
import { documentService } from './dependencies.js';

export class GetDocumentController {
  /**
   * GET /api/v1/documents/:id
   * Retrieves metadata of a single document by UUID.
   */
  public async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      logger.info(
        { userId, documentId: id },
        'Incoming Request: GET /api/v1/documents/:id',
      );

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const document = await documentService.getDocument(id, userId);

      logger.info(
        { userId, documentId: id },
        'Successful Response: Document retrieved successfully',
      );

      ApiResponse.success(res, document, 'Document retrieved successfully');
    } catch (error) {
      logger.error(
        { error, documentId: req.params.id, userId: req.user?.id },
        'Controller Error: Retrieve document failed',
      );
      next(error);
    }
  }
}
