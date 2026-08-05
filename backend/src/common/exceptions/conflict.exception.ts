import { BaseException } from './base.exception.js';

export class ConflictException extends BaseException {
  public readonly statusCode = 409;
  public readonly code = 'CONFLICT';

  constructor(message = 'Resource conflict', details: unknown = null) {
    super(message, details);
  }
}
