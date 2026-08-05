import { BaseException } from './base.exception.js';

export class InternalServerException extends BaseException {
  public readonly statusCode = 500;
  public readonly code = 'INTERNAL_SERVER_ERROR';

  constructor(message = 'An unexpected error occurred', details: unknown = null) {
    super(message, details);
  }
}
