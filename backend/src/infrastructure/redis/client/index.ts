import { createClient, RedisClientType } from 'redis';
import { redisConfig } from '../../../config/redis.config.js';
import { logger } from '../../logger/logger.js';

let redisClient: RedisClientType | null = null;

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    redisClient = createClient({
      url: redisConfig.url,
      socket: {
        reconnectStrategy: (retries) => {
          logger.warn({ retries }, 'Redis connection lost. Retrying...');
          if (retries > 10) {
            logger.fatal('Redis reconnect attempts exceeded limit. Shutting down.');
            return new Error('Max reconnect retries reached');
          }
          // Exponential backoff
          return Math.min(retries * 200, 5000);
        },
      },
    }) as RedisClientType;

    redisClient.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client connected and ready.');
    });

    redisClient.on('error', (err) => {
      logger.error(err, 'Redis Client Error');
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection closed.');
    });
  }

  return redisClient;
};

export const connectRedis = async (): Promise<void> => {
  const client = getRedisClient();
  if (!client.isOpen) {
    await client.connect();
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.disconnect();
  }
};
