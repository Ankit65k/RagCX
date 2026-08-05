import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service.js';
import SessionRepository from '../repositories/session.repository.js';
import { PasswordService } from '../../auth/utils/password.service.js';
import { logger } from '../../../infrastructure/logger/logger.js';
import { SessionNotFoundError } from '../errors/session.errors.js';

const sessionService = new SessionService(
  new SessionRepository(),
  new PasswordService(),
  logger,
);

export class SessionController {
  /**
   * GET /api/v1/sessions
   * Fetches all active tracking sessions for the current logged-in user.
   */
  public async getActiveSessions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const currentSessionId = req.sessionId;

      if (!userId || !currentSessionId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const sessions = await sessionService.getActiveSessions(userId, currentSessionId);

      const mappedSessions = sessions.map((s) => {
        // Construct a descriptive device name
        const os = s.operatingSystem || '';
        const browser = s.browser || '';
        const device = [os, browser].filter(Boolean).join(' / ') || s.deviceName || 'Unknown Device';

        return {
          id: s.id,
          device,
          browser: s.browser || 'Unknown',
          ip: s.ipAddress || 'Unknown',
          lastActivity: s.lastActivity,
          current: s.isCurrent,
        };
      });

      res.status(200).json(mappedSessions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/sessions/:id
   * Revokes a specific session (force logout of a device).
   */
  public async revokeSession(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionToRevokeId = req.params.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const session = await sessionService.getSessionById(sessionToRevokeId);
      if (!session) {
        throw new SessionNotFoundError();
      }

      // Authorization guard: Enforce that users can only revoke their own sessions
      if (session.userId !== userId) {
        res.status(403).json({ message: 'Forbidden: You cannot revoke another user\'s session' });
        return;
      }

      await sessionService.revokeSession(sessionToRevokeId);
      res.status(200).json({ success: true, message: 'Session successfully revoked' });
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        res.status(404).json({ message: error.message });
      } else {
        next(error);
      }
    }
  }
}

export default SessionController;
