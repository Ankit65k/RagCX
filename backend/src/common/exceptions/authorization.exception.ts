import { BaseException } from './base.exception.js';

export class AuthorizationException extends BaseException {
  public readonly statusCode = 403;
  public readonly code = 'FORBIDDEN';

  constructor(message = 'Access denied', details: unknown = null) {
    super(message, details);
  }
}
