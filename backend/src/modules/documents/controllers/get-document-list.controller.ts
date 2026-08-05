import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../infrastructure/logger/logger.js';
import { ApiResponse } from '../../../common/responses/api-response.js';
import { documentService } from './dependencies.js';
import { parsePaginationQuery } from './helpers/query-parser.js';

export class GetDocumentListController {
  /**
   * GET /api/v1/documents
   * Fetches a paginated, filterable, and sorted list of active documents.
   */
  public async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const parsedOptions = parsePaginationQuery(req.query as Record<string, unknown>);

      logger.info(
        { userId, parsedOptions },
        'Incoming Request: GET /api/v1/documents (List)',
      );

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const result = await documentService.listDocuments(userId, parsedOptions);

      logger.info(
        { userId, totalItems: result.meta.totalItems, page: result.meta.currentPage },
        'Successful Response: Document list retrieved successfully',
      );

      ApiResponse.paginate(res, result.items, result.meta, 'Documents retrieved successfully');
    } catch (error) {
      logger.error(
        { error, userId: req.user?.id },
        'Controller Error: Listing documents failed',
      );
      next(error);
    }
  }
}
