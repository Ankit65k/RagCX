/**
 * Event Consumer typed error hierarchy.
 */

export class ConsumerError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'CONSUMER_ERROR') {
    super(message);
    this.name = 'ConsumerError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when an incoming message fails structural or semantic validation.
 */
export class EventValidationError extends ConsumerError {
  public readonly eventType: string;
  public readonly field: string;

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
 * Thrown when an event dispatcher encounters an unknown or unsupported event type.
 */
export class UnknownEventError extends ConsumerError {
  public readonly eventType: string;

  constructor(eventType: string) {
    super(
      `Unknown or unsupported event type: "${eventType}".`,
      'UNKNOWN_EVENT',
    );
    this.name = 'UnknownEventError';
    this.eventType = eventType;
  }
}

/**
 * Thrown when processing of an event fails after validation.
 */
export class ProcessingFailedError extends ConsumerError {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly cause: unknown;

  constructor(eventId: string, eventType: string, message: string, cause?: unknown) {
    super(
      `Failed to process event "${eventType}" (eventId: ${eventId}): ${message}.`,
      'PROCESSING_FAILED',
    );
    this.name = 'ProcessingFailedError';
    this.eventId = eventId;
    this.eventType = eventType;
    this.cause = cause;
  }
}
