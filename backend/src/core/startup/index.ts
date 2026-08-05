import { prisma } from '../../database/client/index.js';
import { connectRedis } from '../../infrastructure/redis/client/index.js';
import { logger } from '../../infrastructure/logger/logger.js';

export const runStartupChecks = async (): Promise<void> => {
  logger.info('Starting pre-launch system checks...');

  // 1. Validate Database Connection
  try {
    logger.info('Checking database connectivity...');
    await prisma.$connect();
    logger.info('Database connection established successfully.');
  } catch (error) {
    logger.warn('Database check failed. Proceeding with warning (please check your DATABASE_URL credentials):');
    logger.warn(error instanceof Error ? error.message : String(error));
  }

  // 2. Validate Redis Connection
  try {
    logger.info('Checking Redis connectivity...');
    await connectRedis();
    logger.info('Redis connection established successfully.');
  } catch (error) {
    logger.warn('Redis check failed. Proceeding with warning:');
    logger.warn(error instanceof Error ? error.message : String(error));
  }

  logger.info('Pre-launch system checks completed.');
};
