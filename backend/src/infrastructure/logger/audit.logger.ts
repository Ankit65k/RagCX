import { logger } from './logger.js';

export interface AuditLogPayload {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  status: 'SUCCESS' | 'FAILURE';
  requestId?: string;
  correlationId?: string;
  meta?: Record<string, unknown>;
}

const auditPino = logger.child({ type: 'audit' });

export const auditLogger = {
  log: (payload: AuditLogPayload) => {
    const { action, resource, status, ...rest } = payload;
    auditPino.info(
      {
        ...rest,
        action,
        resource,
        status,
      },
      `Audit Log: User executed ${action} on ${resource} - Status: ${status}`,
    );
  },
};

export default auditLogger;
