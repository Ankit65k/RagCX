import { BaseException } from '../../../common/exceptions/base.exception.js';

/**
 * Base custom exception for session errors.
 */
export class SessionError extends BaseException {
  constructor(
    message: string,
    public readonly code: string = 'SESSION_ERROR',
    public readonly statusCode: number = 400,
  ) {
    super(message);
  }
}

/**
 * Thrown when a session cannot be located in the database.
 */
export class SessionNotFoundError extends SessionError {
  constructor(message: string = 'Session not found') {
    super(message, 'SESSION_NOT_FOUND', 404);
  }
}

/**
 * Thrown when a session has expired based on its expiresAt value.
 */
export class SessionExpiredError extends SessionError {
  constructor(message: string = 'Session has expired') {
    super(message, 'SESSION_EXPIRED', 401);
  }
}

/**
 * Thrown when a session has been revoked.
 */
export class SessionRevokedError extends SessionError {
  constructor(message: string = 'Session has been revoked') {
    super(message, 'SESSION_REVOKED', 401);
  }
}

/**
 * Thrown when general session validation fails (e.g. token mismatches).
 */
export class InvalidSessionError extends SessionError {
  constructor(message: string = 'Invalid session state') {
    super(message, 'INVALID_SESSION', 400);
  }
}
export default SessionError;
