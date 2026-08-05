export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(statusCode: number, code: string, message: string, details: unknown = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  public static badRequest(message: string, code = 'BAD_REQUEST', details: unknown = null): ApiError {
    return new ApiError(400, code, message, details);
  }

  public static unauthorized(message: string, code = 'UNAUTHORIZED'): ApiError {
    return new ApiError(401, code, message);
  }

  public static forbidden(message: string, code = 'FORBIDDEN'): ApiError {
    return new ApiError(403, code, message);
  }

  public static notFound(message: string, code = 'NOT_FOUND'): ApiError {
    return new ApiError(404, code, message);
  }

  public static internal(message: string, code = 'INTERNAL_SERVER_ERROR'): ApiError {
    return new ApiError(500, code, message);
  }

  public static validation(message: string, details: unknown): ApiError {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }
}

export default ApiError;
