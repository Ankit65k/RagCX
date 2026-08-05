import { BaseException } from './base.exception.js';

export class NotFoundException extends BaseException {
  public readonly statusCode = 404;
  public readonly code = 'NOT_FOUND';

  constructor(message = 'Resource not found', details: unknown = null) {
    super(message, details);
  }
}
