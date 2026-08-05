import { logger } from '../../../logger/logger.js';
import { RETRY_DEFAULTS } from '../constants/event-consumer.constants.js';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `RetryHandler` — manages retrying async callbacks with exponential backoff.
 */
export class RetryHandler {
  /**
   * Runs an operation, retrying on failure using exponential backoff.
   */
  static async execute<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries = RETRY_DEFAULTS.MAX_RETRIES,
    initialDelayMs = RETRY_DEFAULTS.INITIAL_DELAY_MS,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;
        const delay = Math.min(
          initialDelayMs * Math.pow(2, attempt),
          RETRY_DEFAULTS.MAX_DELAY_MS,
        );

        logger.warn(
          {
            err,
            context,
            attempt: attempt + 1,
            maxRetries,
            nextRetryInMs: attempt + 1 < maxRetries ? delay : null,
          },
          'RetryHandler: operation failed, backing off',
        );

        if (attempt + 1 < maxRetries) {
          await sleep(delay);
        }
      }
    }

    logger.error(
      { context, maxRetries },
      'RetryHandler: all retry attempts exhausted',
    );

    throw lastError;
  }
}
