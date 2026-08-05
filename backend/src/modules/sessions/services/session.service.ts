import crypto from 'crypto';
import { Logger } from 'pino';
import { Session } from '@prisma/client';
import SessionRepository from '../repositories/session.repository.js';
import { PasswordService } from '../../auth/utils/password.service.js';
import { ISessionService } from '../../auth/interfaces/auth.interfaces.js';
import {
  DeviceMetadata,
  SessionInfo,
} from '../../auth/types/auth.types.js';
import {
  SessionNotFoundError,
  SessionExpiredError,
  SessionRevokedError,
  InvalidSessionError,
} from '../errors/session.errors.js';
import { InvalidRefreshTokenError } from '../../auth/errors/auth.errors.js';
import { TOKEN_EXPIRATION } from '../../auth/constants/auth.constants.js';

export class SessionService implements ISessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    _passwordService: PasswordService, // Injected to fulfill contract / validation specs
    private readonly logger: Logger,
  ) {}

  /**
   * Helper to compute a secure SHA-256 hash of a token.
   * Cryptographically hides refresh tokens to prevent exposure in case of DB read leak.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Helper to compare two strings in constant time to prevent timing side-channel attacks.
   */
  private safeCompareHashes(hashA: string, hashB: string): boolean {
    const bufferA = Buffer.from(hashA);
    const bufferB = Buffer.from(hashB);
    if (bufferA.length !== bufferB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Creates a new tracking session in the database.
   */
  public async createSession(
    userId: string,
    metadata: DeviceMetadata,
    refreshToken: string,
    sessionId?: string,
  ): Promise<Session> {
    const finalSessionId = sessionId ?? crypto.randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION.REFRESH_TOKEN_MS);
    const hashedRefreshToken = this.hashToken(refreshToken);

    const session = await this.sessionRepository.create({
      id: finalSessionId,
      userId,
      hashedRefreshToken,
      deviceName: metadata.deviceName ?? null,
      deviceType: metadata.deviceType ?? null,
      browser: metadata.browser ?? null,
      operatingSystem: metadata.operatingSystem ?? null,
      ipAddress: metadata.ipAddress ?? null,
      userAgent: metadata.userAgent ?? null,
      expiresAt,
    });

    this.logger.info({ userId, sessionId: finalSessionId }, 'Session created successfully');
    return session;
  }

  /**
   * Validates and rotates an existing session, implementing Refresh Token Rotation (RTR).
   * Throws security error and revokes all active user sessions if reuse is detected.
   */
  public async rotateSession(
    sessionId: string,
    providedRefreshToken: string,
    newRefreshToken: string,
  ): Promise<Session> {
    const session = await this.verifySession(sessionId);

    const hashedIncoming = this.hashToken(providedRefreshToken);

    // Secure constant-time comparison to check if token is valid
    const isMatch = this.safeCompareHashes(session.hashedRefreshToken, hashedIncoming);

    if (!isMatch) {
      // SECURITY BREACH: Previously rotated refresh token reused.
      // Immediately revoke all active sessions for this user to mitigate compromise.
      await this.revokeAllUserSessions(session.userId);
      this.logger.error(
        { userId: session.userId, sessionId: session.id },
        'CRITICAL SECURITY: Refresh token reuse detected! Revoking all sessions for user.',
      );
      throw new InvalidRefreshTokenError('Refresh token has already been used');
    }

    const newHashed = this.hashToken(newRefreshToken);

    const updatedSession = await this.sessionRepository.update(session.id, {
      hashedRefreshToken: newHashed,
      lastActivity: new Date(),
    });

    this.logger.info({ sessionId: session.id }, 'Session rotated successfully');
    return updatedSession;
  }

  /**
   * Returns session details by ID.
   */
  public async getSessionById(sessionId: string): Promise<Session | null> {
    return this.sessionRepository.findById(sessionId);
  }

  /**
   * Locates a session using a plain-text refresh token (hashes it internally to check).
   */
  public async findSessionByRefreshToken(refreshToken: string): Promise<Session | null> {
    const hashedToken = this.hashToken(refreshToken);
    return this.sessionRepository.findByRefreshToken(hashedToken);
  }

  /**
   * Verifies session exists, is not revoked, and is not expired.
   * Throws typed Session exceptions if checks fail.
   */
  public async verifySession(sessionId: string): Promise<Session> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      this.logger.warn({ sessionId }, 'Session verification failed: session not found');
      throw new SessionNotFoundError();
    }

    if (session.isRevoked) {
      this.logger.warn({ sessionId }, 'Session verification failed: session is revoked');
      throw new SessionRevokedError();
    }

    if (session.expiresAt < new Date()) {
      this.logger.warn({ sessionId }, 'Session verification failed: session is expired');
      throw new SessionExpiredError();
    }

    return session;
  }

  /**
   * Updates a session's last activity timestamp, and optionally IP Address & User Agent.
   */
  public async updateLastActivity(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session> {
    const data: Partial<Session> = { lastActivity: new Date() };
    if (ipAddress) data.ipAddress = ipAddress;
    if (userAgent) data.userAgent = userAgent;

    const updatedSession = await this.sessionRepository.update(sessionId, data);
    this.logger.debug({ sessionId }, 'Session last activity updated');
    return updatedSession;
  }

  /**
   * Lists all active sessions for a user, highlighting the current session.
   */
  public async getActiveSessions(userId: string, currentSessionId: string): Promise<SessionInfo[]> {
    const sessions = await this.sessionRepository.findActiveSessions(userId);
    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      deviceName: s.deviceName,
      deviceType: s.deviceType,
      browser: s.browser,
      operatingSystem: s.operatingSystem,
      ipAddress: s.ipAddress,
      lastActivity: s.lastActivity,
      expiresAt: s.expiresAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  /**
   * Revokes a specific session by marking it revoked.
   */
  public async revokeSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }

    await this.sessionRepository.revoke(sessionId);
    this.logger.info({ sessionId }, 'Session revoked successfully');
  }

  /**
   * Revokes all active sessions for a user.
   */
  public async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.revokeAll(userId);
    this.logger.info({ userId }, 'All user sessions revoked successfully');
  }

  /**
   * Purges or revokes expired sessions based on expiration time to keep DB size optimized.
   */
  public async cleanupExpiredSessions(): Promise<void> {
    try {
      const expiredCount = await this.sessionRepository.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true },
          ],
        },
      });
      this.logger.info({ count: expiredCount.count }, 'Session cleanup: expired/revoked sessions purged');
    } catch (error) {
      this.logger.error({ error }, 'Session cleanup failed');
      throw new InvalidSessionError('Failed to perform session cleanup');
    }
  }
}
export default SessionService;
