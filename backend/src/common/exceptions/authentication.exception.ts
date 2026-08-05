import { BaseException } from './base.exception.js';

export class AuthenticationException extends BaseException {
  public readonly statusCode = 401;
  public readonly code = 'UNAUTHENTICATED';

  constructor(message = 'Authentication required', details: unknown = null) {
    super(message, details);
  }
}
