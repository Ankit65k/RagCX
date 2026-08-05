import { RedisClientType } from 'redis';
import { getRedisClient } from '../../client/index.js';
import { logger } from '../../../logger/logger.js';
import { RedisEventSerializer } from '../../event-bus/utils/event-serializer.util.js';
import { MessageValidator } from '../validators/message.validator.js';
import { RetryHandler } from '../retry/retry.handler.js';
import { DeadLetterQueue } from '../dlq/dead-letter-queue.js';
import { EventDispatcher } from '../dispatcher/event-dispatcher.js';
import type { BusEvent } from '../../event-bus/interfaces/event-bus.interface.js';
import type { IEventHandler } from '../interfaces/event-consumer.interface.js';

/**
 * `RedisConsumer` — A generic, highly reusable Redis Pub/Sub consumer.
 *
 * Feature modules register handlers using `register()`.
 * The consumer can subscribe to one or more channels dynamically.
 */
export class RedisConsumer {
  private subscriberClient: RedisClientType | null = null;
  private readonly dispatcher: EventDispatcher;
  private readonly dlq: DeadLetterQueue;
  private isRunning = false;
  private subscribedChannels: string[] = [];

  constructor() {
    this.dispatcher = new EventDispatcher();
    this.dlq = new DeadLetterQueue();
  }

  /**
   * Registers a handler for a specific event type.
   */
  public register(eventType: string, handler: IEventHandler): void {
    this.dispatcher.register(eventType, handler);
  }

  /**
   * Initializes and starts the Redis Pub/Sub subscription for the given channel(s).
   */
  async start(channels: string | string[]): Promise<void> {
    if (this.isRunning) {
      logger.warn('RedisConsumer: consumer is already running. Subscription additions require restart.');
      return;
    }

    const defaultClient = getRedisClient();
    this.subscriberClient = defaultClient.duplicate() as RedisClientType;

    this.subscriberClient.on('connect', () => {
      logger.info('RedisConsumer: subscriber connecting...');
    });
    this.subscriberClient.on('ready', () => {
      logger.info('RedisConsumer: subscriber connected and ready');
    });
    this.subscriberClient.on('error', (err) => {
      logger.error(err, 'RedisConsumer: subscriber error');
    });

    await this.subscriberClient.connect();
    this.isRunning = true;

    this.subscribedChannels = Array.isArray(channels) ? channels : [channels];

    for (const channel of this.subscribedChannels) {
      logger.info({ channel }, 'RedisConsumer: subscribing to channel');
      await this.subscriberClient.subscribe(channel, async (message: string) => {
        await this.handleRawMessage(message, channel);
      });
    }
  }

  /**
   * Stops subscription to all channels and disconnects the client.
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.subscriberClient) {
      return;
    }

    for (const channel of this.subscribedChannels) {
      await this.subscriberClient.unsubscribe(channel);
    }
    await this.subscriberClient.disconnect();
    this.subscriberClient = null;
    this.isRunning = false;
    this.subscribedChannels = [];
    logger.info('RedisConsumer: subscriber stopped and disconnected');
  }

  /**
   * Deserializes, validates, deduplicates, and dispatches incoming messages.
   */
  private async handleRawMessage(rawMessage: string, channel: string): Promise<void> {
    let event: BusEvent<any> | null = null;

    try {
      event = RedisEventSerializer.deserialize<any>(rawMessage);
      
      logger.info(
        { eventId: event.eventId, eventType: event.eventType, correlationId: event.correlationId, channel },
        'RedisConsumer: message received',
      );

      MessageValidator.validate(event);

      const isDuplicate = await this.checkIdempotency(event.eventId);
      if (isDuplicate) {
        logger.info(
          { eventId: event.eventId, correlationId: event.correlationId },
          'RedisConsumer: duplicate event detected, ignoring',
        );
        return;
      }

      const currentEvent = event;
      await RetryHandler.execute(
        async () => this.dispatcher.dispatch(currentEvent),
        `dispatch:${event.eventType}:${event.eventId}`,
      );

      logger.info(
        { eventId: event.eventId, eventType: event.eventType, correlationId: event.correlationId },
        'RedisConsumer: message processed successfully',
      );
    } catch (error) {
      logger.error(
        { error, eventId: event?.eventId, eventType: event?.eventType, channel },
        'RedisConsumer: critical message processing failure',
      );

      if (event) {
        await this.dlq.sendToDLQ(event, (error as Error).message);
      } else {
        logger.error(
          { rawMessage, reason: (error as Error).message, channel },
          'RedisConsumer: raw message could not be deserialized, discarding',
        );
      }
    }
  }

  /**
   * Helper to perform idempotency checks using Redis.
   */
  private async checkIdempotency(eventId: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client.isOpen) {
      logger.warn('RedisConsumer: client not open, skipping idempotency check');
      return false;
    }

    const key = `event:idempotency:${eventId}`;
    const result = await client.set(key, '1', {
      NX: true,
      EX: 86400,
    });

    return result === null;
  }
}
