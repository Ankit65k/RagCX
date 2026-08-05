import { getRedisClient } from '../../client/index.js';
import { logger } from '../../../logger/logger.js';
import {
  PublishFailedError,
  RedisUnavailableError,
} from '../errors/event-bus.errors.js';
import { RedisEventSerializer } from '../utils/event-serializer.util.js';
import { EventFactory } from '../utils/event-factory.util.js';
import { RETRY_DEFAULTS } from '../constants/event-bus.constants.js';
import type { BusEvent } from '../interfaces/event-bus.interface.js';
import type { RedisChannel } from '../../channels/index.js';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const backoffDelay = (attempt: number, initialDelayMs: number): number =>
  Math.min(initialDelayMs * Math.pow(2, attempt), RETRY_DEFAULTS.MAX_DELAY_MS);

/**
 * `RedisPublisher` — handles message dispatching, retries, and health checks.
 */
export class RedisPublisher {
  /**
   * Publishes a single event to Redis Pub/Sub with retry logic.
   */
  static async publish<TPayload>(
    channel: RedisChannel,
    event: BusEvent<TPayload>,
    maxRetries: number = RETRY_DEFAULTS.MAX_RETRIES,
    retryDelayMs: number = RETRY_DEFAULTS.RETRY_DELAY_MS,
  ): Promise<void> {
    const client = getRedisClient();

    // Connection recovery / health-check check
    if (!client.isOpen) {
      logger.warn(`Redis connection closed. Attempting auto-recovery connection before publishing.`);
      try {
        await client.connect();
      } catch (err) {
        throw new RedisUnavailableError(
          `Redis client is offline. Auto-recovery failed. Cannot publish event "${event.eventType}".`,
          err,
        );
      }
    }

    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const stamped = attempt === 0 ? event : EventFactory.withRetryCount(event, attempt);

      try {
        const message = RedisEventSerializer.serialize(stamped);
        const subscribers = await client.publish(channel, message);

        logger.info(
          {
            channel,
            eventType:     stamped.eventType,
            eventId:       stamped.eventId,
            correlationId: stamped.correlationId,
            subscribers,
            attempt:       attempt + 1,
          },
          'RedisPublisher: event published',
        );

        return;
      } catch (err) {
        lastError = err;
        const delay = backoffDelay(attempt, retryDelayMs);

        logger.warn(
          {
            err,
            channel,
            eventType:     event.eventType,
            eventId:       event.eventId,
            correlationId: event.correlationId,
            attempt:       attempt + 1,
            maxRetries,
            nextRetryInMs: attempt + 1 < maxRetries ? delay : null,
          },
          'RedisPublisher: publish attempt failed',
        );

        if (attempt + 1 < maxRetries) {
          await sleep(delay);
        }
      }
    }

    throw new PublishFailedError(event.eventType, maxRetries, lastError);
  }

  /**
   * Publishes a batch of events sequentially.
   */
  static async publishBatch<TPayload>(
    channel: RedisChannel,
    events: BusEvent<TPayload>[],
    maxRetries: number = RETRY_DEFAULTS.MAX_RETRIES,
    retryDelayMs: number = RETRY_DEFAULTS.RETRY_DELAY_MS,
  ): Promise<void> {
    for (const event of events) {
      await this.publish(channel, event, maxRetries, retryDelayMs);
    }
  }

  /**
   * Health Check: returns true if the connection is active.
   */
  static isHealthy(): boolean {
    try {
      return getRedisClient().isOpen;
    } catch {
      return false;
    }
  }
}
