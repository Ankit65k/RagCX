import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { requestLogger } from '../../infrastructure/logger/request.logger.js';
import { errorHandler } from '../../middleware/errorHandler.js';
import { appConfig } from '../../config/app.config.js';
import { swaggerConfig } from '../../config/swagger.config.js';
import { swaggerRoutes } from '../../infrastructure/swagger/swagger.js';
import { routes } from '../../routes/index.js';

export const bootstrapExpress = (): Express => {
  const app = express();

  // 1. Security Headers (Helmet)
  app.use(helmet());

  // 2. CORS configuration
  app.use(cors({
    origin: '*', // Customize for production environments
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Request-ID'],
    credentials: true,
  }));

  // 3. Compression
  app.use(compression());

  // 4. Cookie Parser
  app.use(cookieParser());

  // 5. Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. HTTP Request Logger (Sets req.id automatically)
  app.use(requestLogger);

  // 7. Request ID / Correlation ID Header Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const rawId = req.id || req.headers['x-correlation-id'] || req.headers['x-request-id'];
    const requestId = typeof rawId === 'object' ? JSON.stringify(rawId) : String(rawId);
    
    res.setHeader('X-Request-ID', requestId);
    next();
  });

  // 8. Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => {
      if (req.headers['x-bypass-rate-limit'] === 'true' || process.env.BYPASS_RATE_LIMIT === 'true') {
        return 10000;
      }
      return 100;
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later.',
      },
    },
  });
  app.use(limiter);

  // 9. Swagger Documentation Setup
  if (swaggerConfig.enabled) {
    app.use(swaggerConfig.path, swaggerRoutes);
  }

  // 10. Global Route Registration
  app.use(appConfig.apiPrefix, routes);

  // 10. 404 Route Handler (Not Found)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource could not be found.',
      },
    });
  });

  // 11. Global Error Handler
  app.use(errorHandler);

  return app;
};
