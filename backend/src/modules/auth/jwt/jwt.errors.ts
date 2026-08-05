/**
 * Base error class for all JWT related operations.
 */
export class JwtError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'JWT_ERROR',
    public readonly statusCode: number = 401,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a token has expired.
 */
export class JwtExpiredError extends JwtError {
  constructor(message: string = 'Token has expired') {
    super(message, 'JWT_EXPIRED_ERROR', 401);
  }
}

/**
 * Thrown when a token signature is invalid, tampered with, or structurally malformed.
 */
export class JwtInvalidError extends JwtError {
  constructor(message: string = 'Invalid token') {
    super(message, 'JWT_INVALID_ERROR', 401);
  }
}

/**
 * Thrown when a signing operation fails (e.g. invalid signing secret/options).
 */
export class JwtSignError extends JwtError {
  constructor(message: string = 'Failed to generate token') {
    super(message, 'JWT_SIGN_ERROR', 500);
  }
}
