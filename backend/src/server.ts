import { Server } from 'http';
import { app } from './app.js';
import { appConfig } from './config/app.config.js';
import { runStartupChecks } from './core/startup/index.js';
import { logger } from './infrastructure/logger/logger.js';
import { prisma } from './database/client/index.js';
import { disconnectRedis } from './infrastructure/redis/client/index.js';
import { disconnectSubscriber } from './infrastructure/redis/subscriber/index.js';
import { bootstrapEventConsumer, redisConsumer } from './infrastructure/redis/event-consumer/bootstrap.js';

let server: Server;

// Define a unified shutdown function
const shutdown = async (signal: string, exitCode = 0) => {
  logger.info(`Received ${signal}. Starting clean shutdown...`);
  
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await prisma.$disconnect();
        logger.info('Database client disconnected.');
        await redisConsumer.stop();
        logger.info('Redis consumer stopped.');
        await disconnectRedis();
        logger.info('Redis client disconnected.');
        await disconnectSubscriber();
        logger.info('Redis subscriber client disconnected.');
        logger.info('Graceful shutdown completed.');
        process.exit(exitCode);
      } catch (err) {
        logger.error(err, 'Error occurred during cleanup operations.');
        process.exit(1);
      }
    });
  } else {
    process.exit(exitCode);
  }
};

// Handle process-level uncaught failures
process.on('uncaughtException', (error: Error) => {
  logger.fatal(error, 'UNCAUGHT EXCEPTION! System shutting down immediately...');
  // Force quick shutdown to protect state consistency
  shutdown('UNCAUGHT_EXCEPTION', 1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ reason }, 'UNHANDLED PROMISE REJECTION! System shutting down immediately...');
  shutdown('UNHANDLED_REJECTION', 1);
});

const startServer = async (): Promise<void> => {
  try {
    // 1. Run startup verification checks
    await runStartupChecks();

    // 2. Bind HTTP port
    const port = appConfig.port;
    server = app.listen(port, () => {
      logger.info(`Server is running at http://${appConfig.host}:${port}${appConfig.apiPrefix}`);
      logger.info(`Environment: ${appConfig.env}`);
    });

    // 2.1. Start Redis event consumer subscriptions
    await bootstrapEventConsumer();

    // 3. Graceful shutdown listeners
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.fatal(error, 'Unhandled error during system startup. Exiting process.');
    process.exit(1);
  }
};

startServer();
