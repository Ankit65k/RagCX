import { PrismaClient } from '@prisma/client';
import { logger } from '../../infrastructure/logger/logger.js';
import { appConfig } from '../../config/app.config.js';

interface PrismaLogEvent {
  message: string;
}

interface PrismaQueryEvent {
  query: string;
  params: string;
  duration: number;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

if (appConfig.env !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Wire logs to the infrastructure logger
prisma.$on('query' as never, (e: unknown) => {
  const queryEvent = e as PrismaQueryEvent;
  logger.debug({ query: queryEvent.query, params: queryEvent.params, durationMs: queryEvent.duration }, 'Prisma Query');
});

prisma.$on('info' as never, (e: unknown) => {
  const logEvent = e as PrismaLogEvent;
  logger.info(logEvent.message);
});

prisma.$on('warn' as never, (e: unknown) => {
  const logEvent = e as PrismaLogEvent;
  logger.warn(logEvent.message);
});

prisma.$on('error' as never, (e: unknown) => {
  const logEvent = e as PrismaLogEvent;
  logger.error(logEvent.message);
});

export default prisma;
