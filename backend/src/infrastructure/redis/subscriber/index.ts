import { RedisClientType } from 'redis';
import { getRedisClient } from '../client/index.js';
import { RedisChannel } from '../channels/index.js';
import { BaseRedisEvent } from '../events/index.js';
import { logger } from '../../logger/logger.js';

let subscriberClient: RedisClientType | null = null;

export const getRedisSubscriber = async (): Promise<RedisClientType> => {
  if (!subscriberClient) {
    const defaultClient = getRedisClient();
    // In node-redis, subscription requires a duplicate connection client instance
    subscriberClient = defaultClient.duplicate() as RedisClientType;
    
    subscriberClient.on('connect', () => {
      logger.info('Redis subscriber client connecting...');
    });
    subscriberClient.on('ready', () => {
      logger.info('Redis subscriber client connected and ready.');
    });
    subscriberClient.on('error', (err) => {
      logger.error(err, 'Redis Subscriber Client Error');
    });
  }

  if (!subscriberClient.isOpen) {
    await subscriberClient.connect();
  }

  return subscriberClient;
};

export const subscribeToChannel = async <T>(
  channel: RedisChannel,
  handler: (event: BaseRedisEvent<T>) => void | Promise<void>,
): Promise<void> => {
  const subscriber = await getRedisSubscriber();
  
  await subscriber.subscribe(channel, (message) => {
    try {
      const parsedEvent = JSON.parse(message) as BaseRedisEvent<T>;
      logger.debug(
        { channel, type: parsedEvent.type, requestId: parsedEvent.requestId },
        'Received Redis Pub/Sub message',
      );
      
      const result = handler(parsedEvent);
      if (result instanceof Promise) {
        result.catch((err) => {
          logger.error({ err, type: parsedEvent.type, requestId: parsedEvent.requestId }, 'Error handling async Redis message');
        });
      }
    } catch (error) {
      logger.error({ error, rawMessage: message }, 'Failed to parse or process Redis Pub/Sub message');
    }
  });

  logger.info({ channel }, `Subscribed to Redis channel: ${channel}`);
};

export const unsubscribeFromChannel = async (channel: RedisChannel): Promise<void> => {
  if (subscriberClient && subscriberClient.isOpen) {
    await subscriberClient.unsubscribe(channel);
    logger.info({ channel }, `Unsubscribed from Redis channel: ${channel}`);
  }
};

export const disconnectSubscriber = async (): Promise<void> => {
  if (subscriberClient && subscriberClient.isOpen) {
    await subscriberClient.disconnect();
    logger.info('Redis subscriber client disconnected.');
  }
};
