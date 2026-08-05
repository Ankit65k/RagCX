import { RedisConsumer } from './consumers/redis.consumer.js';
import { DocumentEventConsumer } from './consumers/document-event.consumer.js';
import { EVENT_CONSUMER_CHANNELS } from './constants/event-consumer.constants.js';
import { logger } from '../../logger/logger.js';

// Application-wide RedisConsumer singleton
export const redisConsumer = new RedisConsumer();

/**
 * Bootstraps the Event Consumer by registering handlers and starting channel subscriptions.
 */
export async function bootstrapEventConsumer(): Promise<void> {
  logger.info('EventConsumerBootstrap: starting setup...');

  // 1. Register Document Handlers
  redisConsumer.register(
    'DOCUMENT_PROCESSING_STARTED',
    DocumentEventConsumer.getStartedHandler(),
  );
  redisConsumer.register(
    'DOCUMENT_PROCESSING_COMPLETED',
    DocumentEventConsumer.getCompletedHandler(),
  );
  redisConsumer.register(
    'DOCUMENT_PROCESSING_FAILED',
    DocumentEventConsumer.getFailedHandler(),
  );

  // 2. Start Subscriber Loop
  await redisConsumer.start(EVENT_CONSUMER_CHANNELS.DOCUMENT_JOBS);
  
  logger.info('EventConsumerBootstrap: successfully started and listening');
}
