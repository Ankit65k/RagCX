import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { SessionService } from '../../src/modules/sessions/services/session.service.js';
import SessionRepository from '../../src/modules/sessions/repositories/session.repository.js';
import { PasswordService } from '../../src/modules/auth/utils/password.service.js';
import { logger } from '../../src/infrastructure/logger/logger.js';
import { clearDatabase, seedUser, seedSession } from '../test.helper.js';
import { SessionExpiredError, SessionRevokedError, SessionNotFoundError } from '../../src/modules/sessions/errors/session.errors.js';

describe('SessionService Unit Tests', () => {
  const passwordService = new PasswordService();
  const sessionRepository = new SessionRepository();
  const sessionService = new SessionService(sessionRepository, passwordService, logger);

  let testUser: { id: string };

  beforeEach(async () => {
    await clearDatabase();
    testUser = await seedUser();
  });

  afterAll(async () => {
    await clearDatabase();
  });

  it('should successfully create a session with a hashed refresh token', async () => {
    const metadata = {
      browser: 'Chrome',
      operatingSystem: 'Windows',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0...',
    };

    const session = await sessionService.createSession(testUser.id, metadata, 'my-refresh-token');
    expect(session).toBeDefined();
    expect(session.userId).toBe(testUser.id);
    expect(session.browser).toBe(metadata.browser);
    expect(session.hashedRefreshToken).not.toBe('my-refresh-token'); // must be hashed
  });

  it('should verify an active, non-expired session successfully', async () => {
    const session = await seedSession({ userId: testUser.id });
    const verified = await sessionService.verifySession(session.id);
    expect(verified.id).toBe(session.id);
  });

  it('should throw SessionNotFoundError if session does not exist', async () => {
    await expect(sessionService.verifySession('non-existent-uuid')).rejects.toThrow(SessionNotFoundError);
  });

  it('should throw SessionRevokedError if session is revoked', async () => {
    const session = await seedSession({ userId: testUser.id, isRevoked: true });
    await expect(sessionService.verifySession(session.id)).rejects.toThrow(SessionRevokedError);
  });

  it('should throw SessionExpiredError if session has expired', async () => {
    const session = await seedSession({
      userId: testUser.id,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    });
    await expect(sessionService.verifySession(session.id)).rejects.toThrow(SessionExpiredError);
  });

  it('should revoke a session successfully', async () => {
    const session = await seedSession({ userId: testUser.id });
    await sessionService.revokeSession(session.id);

    const check = await sessionRepository.findById(session.id);
    expect(check?.isRevoked).toBe(true);
  });

  it('should revoke all user sessions successfully', async () => {
    await seedSession({ userId: testUser.id });
    await seedSession({ userId: testUser.id });

    await sessionService.revokeAllUserSessions(testUser.id);

    const active = await sessionRepository.findActiveSessions(testUser.id);
    expect(active.length).toBe(0);
  });
});
