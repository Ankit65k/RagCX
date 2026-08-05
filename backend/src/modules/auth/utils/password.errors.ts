/**
 * Base error for all password related operations.
 */
export class PasswordError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'PASSWORD_ERROR',
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a password does not meet the complexity requirements of the security policy.
 */
export class PasswordValidationError extends PasswordError {
  constructor(
    message: string = 'Password does not meet validation policy requirements',
    public readonly validationErrors: string[] = [],
  ) {
    super(message, 'PASSWORD_VALIDATION_ERROR', 400);
  }
}

/**
 * Thrown when cryptographic hashing fails (internal server error).
 */
export class PasswordHashError extends PasswordError {
  constructor(message: string = 'Password processing failed') {
    super(message, 'PASSWORD_HASH_ERROR', 500);
  }
}
