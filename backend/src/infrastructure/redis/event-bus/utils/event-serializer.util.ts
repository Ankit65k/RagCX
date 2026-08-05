import { SerializationError } from '../errors/event-bus.errors.js';
import type { BusEvent } from '../interfaces/event-bus.interface.js';

/**
 * `RedisEventSerializer` — handles JSON serialization for Redis wire transport.
 */
export class RedisEventSerializer {
  /**
   * Serializes a BusEvent to a string.
   */
  static serialize<TPayload>(event: BusEvent<TPayload>): string {
    try {
      return JSON.stringify(event);
    } catch (cause) {
      throw new SerializationError(
        `Failed to serialize event "${event.eventType}" (eventId: ${event.eventId}).`,
        cause,
      );
    }
  }

  /**
   * Deserializes a string back to a BusEvent envelope.
   */
  static deserialize<TPayload>(raw: string): BusEvent<TPayload> {
    try {
      return JSON.parse(raw) as BusEvent<TPayload>;
    } catch (cause) {
      throw new SerializationError(
        `Failed to deserialize event from Redis message (first 100 chars): "${raw.slice(0, 100)}".`,
        cause,
      );
    }
  }
}
