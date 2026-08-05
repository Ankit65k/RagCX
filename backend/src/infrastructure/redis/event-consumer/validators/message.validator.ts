import { EventValidationError } from '../errors/event-consumer.errors.js';
import { BusEvent } from '../../event-bus/interfaces/event-bus.interface.js';

const REQUIRED_FIELDS: ReadonlyArray<keyof BusEvent> = [
  'eventId',
  'eventType',
  'version',
  'timestamp',
  'correlationId',
  'requestId',
  'payload',
];

/**
 * `MessageValidator` — runtime verification of incoming messages.
 */
export class MessageValidator {
  /**
   * Validates envelope presence, type checks, and document identifier attributes.
   *
   * @throws {EventValidationError}
   */
  static validate<T>(event: BusEvent<T>): void {
    // 1. Envelope fields presence
    for (const field of REQUIRED_FIELDS) {
      const value = event[field];
      if (value === undefined || value === null) {
        throw new EventValidationError(
          event.eventType ?? 'UNKNOWN',
          field,
          'envelope field is required but was null or undefined',
        );
      }
    }

    // 2. Validate version
    if (typeof event.version !== 'string' || event.version.trim().length === 0) {
      throw new EventValidationError(
        event.eventType,
        'version',
        'must be a non-empty string',
      );
    }

    // 3. Validate payload shape exists and contains documentId
    if (typeof event.payload !== 'object' || event.payload === null) {
      throw new EventValidationError(
        event.eventType,
        'payload',
        'payload must be a non-null object',
      );
    }

    const payloadObj = event.payload as Record<string, unknown>;
    if (!payloadObj.documentId || typeof payloadObj.documentId !== 'string' || payloadObj.documentId.trim().length === 0) {
      throw new EventValidationError(
        event.eventType,
        'payload.documentId',
        'documentId must be a non-empty string inside the payload',
      );
    }
  }
}
