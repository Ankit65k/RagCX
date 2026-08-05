import type { RedisChannel } from '../../channels/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Event type registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All first-party event type strings.
 * Exhaustive union — the compiler enforces that every switch statement
 * handles every value, making unhandled-event bugs impossible.
 */
export type EventType =
  // Document lifecycle
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_PROCESSING_STARTED'
  | 'DOCUMENT_PROCESSING_COMPLETED'
  | 'DOCUMENT_PROCESSING_FAILED'
  | 'DOCUMENT_REPROCESS_REQUESTED'
  | 'DOCUMENT_DELETED'
  | 'DOCUMENT_RESTORED'
  // Chat (future-ready)
  | 'CHAT_REQUEST'
  | 'CHAT_RESPONSE';

// ─────────────────────────────────────────────────────────────────────────────
// Event envelope
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every event that crosses the Event Bus MUST conform to this envelope.
 *
 * Fields:
 * - `eventId`       — UUID v4 uniquely identifying this specific emission.
 * - `eventType`     — Discriminant string (EventType union).
 * - `version`       — Schema version (semver-lite, e.g. "1.0").
 * - `timestamp`     — ISO-8601 emission instant (UTC).
 * - `correlationId` — Links a chain of causally related events (e.g. one upload
 *                     triggers processing, completion — all share the same correlationId).
 * - `requestId`     — Echoed from the originating HTTP request for distributed tracing.
 * - `producer`      — Service name that emitted the event.
 * - `payload`       — Typed domain payload (varies by eventType).
 * - `metadata`      — Non-domain cross-cutting fields (env, retry count, etc.).
 */
export interface BusEvent<TPayload = unknown> {
  /** Unique ID for this single emission (UUID v4). */
  readonly eventId: string;

  /** Discriminant event type. */
  readonly eventType: EventType;

  /** Payload schema version (e.g. "1.0"). */
  readonly version: string;

  /** ISO-8601 UTC timestamp of when the event was created. */
  readonly timestamp: string;

  /**
   * Causal chain ID — identical across all events triggered by the same
   * upstream action (e.g. one file upload → processing → completion).
   */
  readonly correlationId: string;

  /**
   * Originating HTTP request ID — propagated for end-to-end tracing
   * across services and log streams.
   */
  readonly requestId: string;

  /** Identifier of the service that published the event. */
  readonly producer: string;

  /** Domain-specific event data. */
  readonly payload: TPayload;

  /** Cross-cutting operational metadata. */
  readonly metadata: EventMetadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface EventMetadata {
  /** Publishing service name (matches `BusEvent.producer`). */
  readonly service: string;

  /** Deployment environment (development / staging / production). */
  readonly environment: string;

  /** ISO-8601 UTC timestamp of the publish call (may differ from `timestamp`). */
  readonly publishedAt: string;

  /** Payload schema version — allows consumers to route by version. */
  readonly schemaVersion: string;

  /** Number of times this event has been retried. 0 on first attempt. */
  readonly retryCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Publish options
// ─────────────────────────────────────────────────────────────────────────────

export interface PublishOptions {
  /**
   * Target Redis channel. Defaults to the channel mapping for the event type.
   * Override only when you need to fan-out to a non-default channel.
   */
  channel?: RedisChannel;

  /**
   * Maximum publish attempts (including the first). Defaults to 3.
   */
  maxRetries?: number;

  /**
   * Initial retry back-off in milliseconds. Subsequent attempts double.
   * Defaults to 200 ms.
   */
  retryDelayMs?: number;

  /**
   * When true, a publish failure after all retries is logged but not thrown.
   * Use for best-effort events (e.g. delete notifications).
   */
  swallowErrors?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Bus contract
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `IEventBus` — the single surface that all feature modules use to emit events.
 *
 * Feature modules never call `getRedisClient()` or `RedisPublisher` directly.
 * All publish operations flow through this interface, which handles:
 * - Validation
 * - Serialization
 * - Channel routing
 * - Retry with exponential back-off
 * - Structured logging
 */
export interface IEventBus {
  /**
   * Publishes a single typed event to the Redis Pub/Sub channel.
   *
   * @throws {EventValidationError}   When required fields are missing.
   * @throws {SerializationError}     When JSON serialization fails.
   * @throws {PublishFailedError}     When all retry attempts are exhausted.
   * @throws {RedisUnavailableError}  When the Redis connection is not open.
   */
  publish<TPayload>(
    event: BusEvent<TPayload>,
    options?: PublishOptions,
  ): Promise<void>;

  /**
   * Publishes multiple events sequentially.
   * On the first failure the batch stops and re-throws (unless `swallowErrors` is set).
   */
  publishBatch<TPayload>(
    events: BusEvent<TPayload>[],
    options?: PublishOptions,
  ): Promise<void>;

  /**
   * Returns true when the underlying Redis connection is open and ready.
   */
  isHealthy(): boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory options
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration passed to `EventFactory.create()`.
 */
export interface EventFactoryOptions {
  correlationId: string;
  requestId: string;
  producer?: string;
  version?: string;
}
