import { BaseException } from '../../../common/exceptions/base.exception.js';

/**
 * Base custom authentication error class.
 */
export class AuthError extends BaseException {
  constructor(
    message: string,
    public readonly code: string = 'AUTH_ERROR',
    public readonly statusCode: number = 401,
  ) {
    super(message);
  }
}

/**
 * Thrown when credentials (email/password) are incorrect.
 */
export class InvalidCredentialsError extends AuthError {
  constructor(message: string = 'Invalid email or password') {
    super(message, 'INVALID_CREDENTIALS', 401);
  }
}

/**
 * Thrown when an inactive or disabled user attempts authentication.
 */
export class InactiveUserError extends AuthError {
  constructor(message: string = 'User account is inactive or disabled') {
    super(message, 'INACTIVE_USER', 403);
  }
}

/**
 * Thrown when a refresh token is invalid, malformed, or doesn't match the record.
 */
export class InvalidRefreshTokenError extends AuthError {
  constructor(message: string = 'Invalid refresh token') {
    super(message, 'INVALID_REFRESH_TOKEN', 401);
  }
}

/**
 * Thrown when a session has expired based on standard configuration.
 */
export class SessionExpiredError extends AuthError {
  constructor(message: string = 'Session has expired') {
    super(message, 'SESSION_EXPIRED', 401);
  }
}

/**
 * Thrown when a revoked session is accessed.
 */
export class SessionRevokedError extends AuthError {
  constructor(message: string = 'Session has been revoked') {
    super(message, 'SESSION_REVOKED', 401);
  }
}

/**
 * Thrown when general authorization or access checks fail.
 */
export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/**
 * Thrown when role or permission checks fail.
 */
export class ForbiddenError extends AuthError {
  constructor(message: string = 'Access forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

/**
 * Thrown when JWT signature verification fails.
 */
export class InvalidTokenError extends AuthError {
  constructor(message: string = 'Invalid or malformed access token') {
    super(message, 'INVALID_TOKEN', 401);
  }
}

/**
 * Thrown when an email is already taken during registration.
 */
export class EmailAlreadyInUseError extends AuthError {
  constructor(message: string = 'Email address is already in use') {
    super(message, 'EMAIL_ALREADY_IN_USE', 400);
  }
}
