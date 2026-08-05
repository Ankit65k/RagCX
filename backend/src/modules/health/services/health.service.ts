import { prisma } from '../../../database/client/index.js';
import { getRedisClient } from '../../../infrastructure/redis/client/index.js';
import { appConfig } from '../../../config/app.config.js';

export interface HealthCheckResult {
  status: 'UP' | 'DOWN';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  services: {
    database: 'UP' | 'DOWN';
    redis: 'UP' | 'DOWN';
  };
}

export class HealthService {
  public async getSystemHealth(): Promise<HealthCheckResult> {
    let dbStatus: 'UP' | 'DOWN' = 'UP';
    let redisStatus: 'UP' | 'DOWN' = 'UP';

    // 1. Check Database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'DOWN';
    }

    // 2. Check Redis connection
    try {
      const redisClient = getRedisClient();
      if (redisClient.isOpen) {
        const ping = await redisClient.ping();
        if (ping !== 'PONG') {
          redisStatus = 'DOWN';
        }
      } else {
        redisStatus = 'DOWN';
      }
    } catch {
      redisStatus = 'DOWN';
    }

    const overallStatus: 'UP' | 'DOWN' = (dbStatus === 'UP' && redisStatus === 'UP') ? 'UP' : 'DOWN';
    
    // Read package version
    const version = process.env.npm_package_version || '1.0.0';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: appConfig.env,
      version,
      memoryUsage: {
        rss: process.memoryUsage().rss,
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed,
        external: process.memoryUsage().external,
      },
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }
}

export default HealthService;
