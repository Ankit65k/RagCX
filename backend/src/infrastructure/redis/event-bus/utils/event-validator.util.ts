import { EventValidationError } from '../errors/event-bus.errors.js';
import type { BusEvent, EventType } from '../interfaces/event-bus.interface.js';

const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set<EventType>([
  'DOCUMENT_UPLOADED',
  'DOCUMENT_PROCESSING_STARTED',
  'DOCUMENT_PROCESSING_COMPLETED',
  'DOCUMENT_PROCESSING_FAILED',
  'DOCUMENT_REPROCESS_REQUESTED',
  'DOCUMENT_DELETED',
  'DOCUMENT_RESTORED',
  'CHAT_REQUEST',
  'CHAT_RESPONSE',
]);

const REQUIRED_FIELDS: ReadonlyArray<keyof BusEvent> = [
  'eventId',
  'eventType',
  'version',
  'timestamp',
  'correlationId',
  'requestId',
  'producer',
  'payload',
  'metadata',
];

const REQUIRED_METADATA_FIELDS: ReadonlyArray<keyof BusEvent['metadata']> = [
  'service',
  'environment',
  'publishedAt',
  'schemaVersion',
  'retryCount',
];

/**
 * `RedisEventValidator` — validates event structure and envelope fields.
 */
export class RedisEventValidator {
  /**
   * Validates structural compliance of a BusEvent.
   *
   * @throws {EventValidationError} On first invalid field.
   */
  static validate<TPayload>(event: BusEvent<TPayload>): void {
    for (const field of REQUIRED_FIELDS) {
      const value = event[field];
      if (value === undefined || value === null) {
        throw new EventValidationError(
          event.eventType ?? 'UNKNOWN',
          field,
          'field is required but was null or undefined',
        );
      }

      if (typeof value === 'string' && value.trim().length === 0) {
        throw new EventValidationError(
          event.eventType ?? 'UNKNOWN',
          field,
          'field must not be an empty string',
        );
      }
    }

    if (!KNOWN_EVENT_TYPES.has(event.eventType)) {
      throw new EventValidationError(
        event.eventType,
        'eventType',
        `"${event.eventType}" is not a recognized event type`,
      );
    }

    if (typeof event.metadata !== 'object' || event.metadata === null) {
      throw new EventValidationError(
        event.eventType,
        'metadata',
        'metadata must be a non-null object',
      );
    }

    for (const field of REQUIRED_METADATA_FIELDS) {
      const value = event.metadata[field];
      if (value === undefined || value === null) {
        throw new EventValidationError(
          event.eventType,
          `metadata.${field}`,
          'metadata field is required but was null or undefined',
        );
      }
    }

    if (typeof event.payload !== 'object' || event.payload === null) {
      throw new EventValidationError(
        event.eventType,
        'payload',
        'payload must be a non-null object',
      );
    }
  }

  /**
   * Checks event validity without throwing an exception.
   */
  static isValid<TPayload>(event: BusEvent<TPayload>): boolean {
    try {
      RedisEventValidator.validate(event);
      return true;
    } catch {
      return false;
    }
  }
}
