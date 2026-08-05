import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../infrastructure/logger/logger.js';
import { ApiResponse } from '../../../common/responses/api-response.js';
import { documentService } from './dependencies.js';
import { ValidationError } from '../../../common/exceptions/validation.exception.js';

export class UploadDocumentController {
  /**
   * POST /api/v1/documents
   * Orchestrates the document upload request.
   */
  public async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const file = req.uploadedFile;
      const correlationId = (req.headers['x-correlation-id'] || req.id || '').toString();

      logger.info(
        { userId, originalFilename: file?.originalFilename, correlationId },
        'Incoming Request: POST /api/v1/documents (Upload)',
      );

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!file) {
        throw new ValidationError('Upload validation failed', [
          {
            field: 'file',
            message: 'No file context found on request. Ensure upload middleware executes first.',
            rule: 'required',
          },
        ]);
      }

      const document = await documentService.uploadDocument({
        file: {
          originalFilename: file.originalFilename,
          storedFilename:   file.storedFilename,
          mimeType:         file.mimeType,
          extension:        file.extension,
          fileSize:         file.fileSize,
          storagePath:      file.storagePath,
          checksum:         file.checksum,
          buffer:           file.buffer!,
        },
        uploadedBy: userId,
        correlationId,
      });

      logger.info(
        { userId, documentId: document.id, correlationId },
        'Successful Response: Document uploaded and metadata saved',
      );

      ApiResponse.created(res, document, 'Document uploaded successfully');
    } catch (error) {
      logger.error(
        { error, userId: req.user?.id },
        'Controller Error: Document upload failed',
      );
      next(error);
    }
  }
}
