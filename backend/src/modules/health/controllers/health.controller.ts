import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../services/health.service.js';
import { ApiResponse } from '../../../common/responses/api-response.js';

export class HealthController {
  private readonly healthService = new HealthService();

  public getHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const healthReport = await this.healthService.getSystemHealth();
      
      const statusCode = healthReport.status === 'UP' ? 200 : 503;
      
      ApiResponse.success(
        res,
        healthReport,
        healthReport.status === 'UP' ? 'System is healthy' : 'System is experiencing issues',
        statusCode
      );
    } catch (error) {
      next(error);
    }
  };
}

export default HealthController;
