export abstract class BaseException extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly code: string;
  public readonly details: unknown;

  constructor(message: string, details: unknown = null) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export default BaseException;
