/**
 * Event Bus typed error hierarchy.
 *
 * All errors carry a stable `code` string for monitoring, alert routing,
 * and error-handler branching without brittle message-string matching.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Base
// ─────────────────────────────────────────────────────────────────────────────

export class EventBusError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'EVENT_BUS_ERROR') {
    super(message);
    this.name = 'EventBusError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Concrete errors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when a required field is missing or fails type-level validation.
 */
export class EventValidationError extends EventBusError {
  public readonly field: string;
  public readonly eventType: string;

  constructor(eventType: string, field: string, reason: string) {
    super(
      `Event validation failed for "${eventType}" on field "${field}": ${reason}.`,
      'EVENT_VALIDATION_FAILED',
    );
    this.name = 'EventValidationError';
    this.eventType = eventType;
    this.field = field;
  }
}

/**
 * Thrown when JSON serialization or deserialization fails.
 */
export class SerializationError extends EventBusError {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, 'SERIALIZATION_ERROR');
    this.name = 'SerializationError';
    this.cause = cause;
  }
}

/**
 * Thrown when Redis is unavailable and all retry attempts are exhausted.
 */
export class RedisUnavailableError extends EventBusError {
  public readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message, 'REDIS_UNAVAILABLE');
    this.name = 'RedisUnavailableError';
    this.cause = cause;
  }
}

/**
 * Thrown when publish fails after all retries have been exhausted.
 * Wraps the last underlying error for tracing.
 */
export class PublishFailedError extends EventBusError {
  public readonly eventType: string;
  public readonly attempts: number;
  public readonly cause: unknown;

  constructor(eventType: string, attempts: number, cause?: unknown) {
    super(
      `Failed to publish event "${eventType}" after ${attempts} attempt(s).`,
      'PUBLISH_FAILED',
    );
    this.name = 'PublishFailedError';
    this.eventType = eventType;
    this.attempts = attempts;
    this.cause = cause;
  }
}
