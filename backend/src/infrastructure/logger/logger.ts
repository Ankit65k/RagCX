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
  transport: appConfig.env === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss Z',
      ignore: 'pid,hostname,service,environment',
    },
  } : undefined,
});

export default logger;
