import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import bcrypt from 'bcrypt';
import { AuthenticationService } from '../../src/modules/auth/services/auth.service.js';
import UserRepository from '../../src/modules/users/repositories/user.repository.js';
import SessionRepository from '../../src/modules/sessions/repositories/session.repository.js';
import { SessionService } from '../../src/modules/sessions/services/session.service.js';
import { JwtService } from '../../src/modules/auth/jwt/jwt.service.js';
import { PasswordService } from '../../src/modules/auth/utils/password.service.js';
import { logger } from '../../src/infrastructure/logger/logger.js';
import { clearDatabase, seedUser } from '../test.helper.js';
import { InvalidCredentialsError, InactiveUserError } from '../../src/modules/auth/errors/auth.errors.js';

describe('AuthenticationService Unit Tests', () => {
  const passwordService = new PasswordService();
  const sessionRepository = new SessionRepository();
  const sessionService = new SessionService(sessionRepository, passwordService, logger);
  const userRepository = new UserRepository();
  const jwtService = new JwtService();

  const authService = new AuthenticationService(
    userRepository,
    sessionService,
    jwtService,
    passwordService,
    logger,
  );

  const rawPassword = 'SecureP@ss1234';
  let passwordHash: string;

  beforeEach(async () => {
    await clearDatabase();
    passwordHash = await bcrypt.hash(rawPassword, 12);
  });

  afterAll(async () => {
    await clearDatabase();
  });

  it('should log in a user with correct credentials and return tokens', async () => {
    const user = await seedUser({ passwordHash });
    const metadata = { ipAddress: '127.0.0.1', userAgent: 'Chrome' };

    const result = await authService.login({ email: user.email, password: rawPassword }, metadata);
    expect(result).toBeDefined();
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(result.user.email).toBe(user.email);
  });

  it('should throw InvalidCredentialsError for unknown email', async () => {
    const metadata = { ipAddress: '127.0.0.1', userAgent: 'Chrome' };
    await expect(
      authService.login({ email: 'unknown@example.com', password: rawPassword }, metadata),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('should throw InvalidCredentialsError for wrong password', async () => {
    const user = await seedUser({ passwordHash });
    const metadata = { ipAddress: '127.0.0.1', userAgent: 'Chrome' };
    await expect(
      authService.login({ email: user.email, password: 'WrongPassword123!' }, metadata),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('should throw InactiveUserError for inactive user logins', async () => {
    const user = await seedUser({ passwordHash, isActive: false });
    const metadata = { ipAddress: '127.0.0.1', userAgent: 'Chrome' };
    await expect(
      authService.login({ email: user.email, password: rawPassword }, metadata),
    ).rejects.toThrow(InactiveUserError);
  });
});
