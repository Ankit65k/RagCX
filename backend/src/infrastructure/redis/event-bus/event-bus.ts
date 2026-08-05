import { logger } from '../../logger/logger.js';
import { RedisPublisher } from './publisher/redis-publisher.js';
import { RedisEventValidator } from './utils/event-validator.util.js';
import { EVENT_CHANNEL_MAP } from './constants/event-bus.constants.js';
import type {
  IEventBus,
  BusEvent,
  PublishOptions,
} from './interfaces/event-bus.interface.js';

/**
 * `EventBus` — public facade matching the event bus specifications.
 */
export class EventBus implements IEventBus {
  async publish<TPayload>(
    event: BusEvent<TPayload>,
    options: PublishOptions = {},
  ): Promise<void> {
    const { maxRetries, retryDelayMs, swallowErrors = false } = options;

    RedisEventValidator.validate(event);

    const channel = options.channel ?? EVENT_CHANNEL_MAP[event.eventType];

    logger.debug(
      {
        eventType:     event.eventType,
        eventId:       event.eventId,
        correlationId: event.correlationId,
        channel,
      },
      'EventBus: validating and publishing event',
    );

    try {
      await RedisPublisher.publish(channel, event, maxRetries, retryDelayMs);
    } catch (err) {
      logger.error(
        {
          err,
          eventType:     event.eventType,
          eventId:       event.eventId,
          correlationId: event.correlationId,
          channel,
          swallowErrors,
        },
        'EventBus: failed to dispatch event',
      );

      if (!swallowErrors) throw err;
    }
  }

  async publishBatch<TPayload>(
    events: BusEvent<TPayload>[],
    options: PublishOptions = {},
  ): Promise<void> {
    for (const event of events) {
      await this.publish(event, options);
    }
  }

  isHealthy(): boolean {
    return RedisPublisher.isHealthy();
  }
}

export const eventBus: IEventBus = new EventBus();
