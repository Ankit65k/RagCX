import { Prisma } from '@prisma/client';
import { logger } from '../../infrastructure/logger/logger.js';

export const loggingExtension = Prisma.defineExtension({
  name: 'query-logger',
  query: {
    $allOperations({ model, operation, args, query }) {
      const start = performance.now();
      return query(args).finally(() => {
        const duration = performance.now() - start;
        logger.debug(
          {
            model,
            operation,
            durationMs: parseFloat(duration.toFixed(2)),
          },
          `Prisma Operation: ${model}.${operation} executed in ${duration.toFixed(2)}ms`,
        );
      });
    },
  },
});

export default loggingExtension;
