import { v4 as uuidv4 } from 'uuid';

/**
 * `CorrelationIdGenerator` — handles generation of RFC-4122 v4 UUIDs
 * for distributed tracing and correlation.
 */
export class CorrelationIdGenerator {
  /**
   * Generates a new RFC-4122 v4 UUID for tracing a causal chain of events.
   */
  static generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Generates a unique event ID for a single emission.
   */
  static generateEventId(): string {
    return uuidv4();
  }

  /**
   * Resolves a request ID, generating a fallback UUID if none is provided.
   */
  static resolveRequestId(requestId?: string): string {
    return requestId && requestId.trim().length > 0
      ? requestId.trim()
      : uuidv4();
  }
}
