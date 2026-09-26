import { pino } from 'pino';
import { loggerConfig } from '../../config/logger.config.js';
import { appConfig } from '../../config/app.config.js';

export const logger = pino({
  level: loggerConfig.level,
  mixin() {
    return {
      service: 'backend',
      environment: appConfig.env,
    };
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Note: pino-pretty disabled due to ESM compatibility issues with Node.js 26
  // TODO: Re-enable when pino-pretty supports Node.js 26 ESM properly
});

export default logger;
