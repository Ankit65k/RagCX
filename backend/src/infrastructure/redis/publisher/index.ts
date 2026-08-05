import { getRedisClient } from '../client/index.js';
import { BaseRedisEvent } from '../events/index.js';
import { RedisChannel } from '../channels/index.js';
import { logger } from '../../logger/logger.js';

export class RedisPublisher {
  public static async publish<T>(
    channel: RedisChannel,
    event: BaseRedisEvent<T>,
  ): Promise<number> {
    const client = getRedisClient();
    if (!client.isOpen) {
      logger.error('Failed to publish event: Redis client connection is not open.');
      throw new Error('Redis connection is closed');
    }
    
    const message = JSON.stringify(event);
    logger.debug({ channel, type: event.type, requestId: event.requestId }, 'Publishing Redis event');
    
    return client.publish(channel, message);
  }
}

export default RedisPublisher;
