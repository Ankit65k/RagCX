import { Request } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';
import { appConfig } from '../../config/app.config.js';

// Simple helper to generate ID if util doesn't exist yet
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req: Request) => {
    const id = req.headers['x-correlation-id'] || req.headers['x-request-id'] || generateId();
    return id as string;
  },
  autoLogging: true,
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customProps: (req: Request) => {
    return {
      requestId: req.id,
      correlationId: req.headers['x-correlation-id'] || req.id,
    };
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      id: req.id,
      headers: appConfig.env === 'development' ? undefined : {
        'user-agent': req.headers['user-agent'],
        host: req.headers['host'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

export default requestLogger;
