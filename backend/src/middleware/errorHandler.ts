import { Request, Response, NextFunction } from 'express';
import { logger } from '../infrastructure/logger/logger.js';
import { BaseException } from '../common/exceptions/base.exception.js';
import { appConfig } from '../config/app.config.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown = null;

  const innerError = (err as any).cause || err;

  // Handle our framework BaseException classes
  if (err instanceof BaseException) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if ((err as any).code === 'DOCUMENT_NOT_FOUND') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = err.message;
  } else if ((err as any).code === 'DUPLICATE_DOCUMENT') {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = err.message;
    details = {
      existingDocumentId: (err as any).existingDocumentId,
      checksum: (err as any).checksum,
    };
  } else if ((err as any).code === 'DOCUMENT_OWNERSHIP_DENIED') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = err.message;
  } else if ((err as any).code === 'INVALID_DOCUMENT_STATE') {
    statusCode = 422;
    errorCode = 'UNPROCESSABLE_ENTITY';
    message = err.message;
  } else if (
    (innerError as any).code === 'P2023' ||
    (innerError.message && (
      innerError.message.includes('Malformed ObjectID') ||
      innerError.message.includes('Inconsistent column data') ||
      innerError.message.includes('invalid input syntax for type uuid')
    ))
  ) {
    statusCode = 400;
    errorCode = 'BAD_REQUEST';
    message = 'Invalid identifier parameter format';
  }

  // Log error using structure format
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        code: errorCode,
        details,
      },
    },
    `Global Error Intercepted: [${errorCode}] - ${message}`,
  );

  // Return environment-aware payload (stack traces only in non-production)
  const isDevOrTest = appConfig.env === 'development' || appConfig.env === 'testing';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details ? { details } : {}),
      ...(isDevOrTest ? { stack: err.stack } : {}),
    },
  });
};

export default errorHandler;
