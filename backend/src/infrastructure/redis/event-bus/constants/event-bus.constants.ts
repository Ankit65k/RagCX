import type { RedisChannel } from '../../channels/index.js';
import type { EventType } from '../interfaces/event-bus.interface.js';

// ─────────────────────────────────────────────────────────────────────────────
// Channel routing table
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps every EventType to its default Redis channel.
 *
 * The EventBus reads this table during publish — callers never hard-code
 * channel names. Adding a new event type requires only one entry here.
 */
export const EVENT_CHANNEL_MAP: Readonly<Record<EventType, RedisChannel>> = {
  DOCUMENT_UPLOADED:               'document:jobs',
  DOCUMENT_PROCESSING_STARTED:     'document:jobs',
  DOCUMENT_PROCESSING_COMPLETED:   'document:jobs',
  DOCUMENT_PROCESSING_FAILED:      'document:jobs',
  DOCUMENT_REPROCESS_REQUESTED:    'document:jobs',
  DOCUMENT_DELETED:                'document:jobs',
  DOCUMENT_RESTORED:               'document:jobs',
  CHAT_REQUEST:                    'chat:jobs',
  CHAT_RESPONSE:                   'chat:jobs',
};

// ─────────────────────────────────────────────────────────────────────────────
// Retry defaults
// ─────────────────────────────────────────────────────────────────────────────

export const RETRY_DEFAULTS = Object.freeze({
  /** Number of total attempts (first try + retries). */
  MAX_RETRIES:     3,

  /** Initial back-off in ms; doubles on each subsequent attempt. */
  RETRY_DELAY_MS:  200,

  /** Maximum back-off cap to prevent unbounded waits. */
  MAX_DELAY_MS:    5_000,
});

// ─────────────────────────────────────────────────────────────────────────────
// Producer identity
// ─────────────────────────────────────────────────────────────────────────────

/** Default producer name stamped on every event emitted from this service. */
export const DEFAULT_PRODUCER = 'ragcx-backend';

/** Current schema version for all events produced by this service. */
export const CURRENT_SCHEMA_VERSION = '1.0';
