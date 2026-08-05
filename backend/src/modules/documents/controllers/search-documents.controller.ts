import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../infrastructure/logger/logger.js';
import { ApiResponse } from '../../../common/responses/api-response.js';
import { documentService } from './dependencies.js';
import { parsePaginationQuery } from './helpers/query-parser.js';
import { ValidationError } from '../../../common/exceptions/validation.exception.js';

export class SearchDocumentsController {
  /**
   * GET /api/v1/documents/search
   * Performs full-text search over document filenames with filtering and sorting support.
   */
  public async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const parsedOptions = parsePaginationQuery(req.query as Record<string, unknown>);

      logger.info(
        { userId, parsedOptions },
        'Incoming Request: GET /api/v1/documents/search',
      );

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!parsedOptions.search) {
        throw new ValidationError('Search query is required', [
          {
            field: 'search',
            message: 'Query parameter "search" must be a non-empty string.',
            rule: 'required',
          },
        ]);
      }

      const result = await documentService.searchDocuments(userId, parsedOptions);

      logger.info(
        { userId, totalItems: result.meta.totalItems, search: parsedOptions.search },
        'Successful Response: Document search completed successfully',
      );

      ApiResponse.paginate(res, result.items, result.meta, 'Documents retrieved successfully');
    } catch (error) {
      logger.error(
        { error, userId: req.user?.id },
        'Controller Error: Document search failed',
      );
      next(error);
    }
  }
}
