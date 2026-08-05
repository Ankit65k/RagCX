export const EVENT_CONSUMER_CHANNELS = Object.freeze({
  /** Input channel where the consumer listens for Python AI events */
  DOCUMENT_JOBS: 'document:jobs',
  
  /** Architecture-ready Dead Letter Queue channel name */
  DOCUMENT_FAILED_DLQ: 'document:failed:dlq',
});

export const RETRY_DEFAULTS = Object.freeze({
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 200,
  MAX_DELAY_MS: 5000,
});
