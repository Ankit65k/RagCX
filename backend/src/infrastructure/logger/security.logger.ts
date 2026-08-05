import { logger } from './logger.js';

export interface SecurityLogPayload {
  event: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

const securityPino = logger.child({ type: 'security' });

export const securityLogger = {
  log: (payload: SecurityLogPayload) => {
    const { event, severity, ...rest } = payload;
    
    // Determine logging function level based on severity
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      securityPino.error(
        { ...rest, event, severity },
        `Security Alert [${severity}]: ${event}`,
      );
    } else if (severity === 'MEDIUM') {
      securityPino.warn(
        { ...rest, event, severity },
        `Security Alert [${severity}]: ${event}`,
      );
    } else {
      securityPino.info(
        { ...rest, event, severity },
        `Security Alert [${severity}]: ${event}`,
      );
    }
  },
};

export default securityLogger;
