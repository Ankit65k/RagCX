import { BaseException } from './base.exception.js';

export class ValidationError extends BaseException {
  public readonly statusCode = 400;
  public readonly code = 'VALIDATION_ERROR';

  constructor(message = 'Validation failed', details: unknown = null) {
    super(message, details);
  }
}
