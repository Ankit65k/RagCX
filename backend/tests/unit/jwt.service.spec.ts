import { describe, it, expect } from 'vitest';
import { JwtService } from '../../src/modules/auth/jwt/jwt.service.js';
import { JwtExpiredError, JwtInvalidError } from '../../src/modules/auth/jwt/jwt.errors.js';

describe('JwtService Unit Tests', () => {
  const jwtService = new JwtService();

  const mockPayload = {
    sub: 'user-uuid-1234',
    role: 'USER' as const,
    sessionId: 'session-uuid-5678',
    tokenVersion: 1,
    jti: 'token-jti-abcd',
  };

  it('should successfully sign and verify access tokens', async () => {
    const token = await jwtService.signAccessToken({
      ...mockPayload,
      type: 'access',
    });
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = await jwtService.verifyAccessToken(token);
    expect(decoded.sub).toBe(mockPayload.sub);
    expect(decoded.role).toBe(mockPayload.role);
    expect(decoded.sessionId).toBe(mockPayload.sessionId);
    expect(decoded.type).toBe('access');
  });

  it('should successfully sign and verify refresh tokens', async () => {
    const token = await jwtService.signRefreshToken({
      ...mockPayload,
      type: 'refresh',
    });
    expect(token).toBeDefined();

    const decoded = await jwtService.verifyRefreshToken(token);
    expect(decoded.sub).toBe(mockPayload.sub);
    expect(decoded.sessionId).toBe(mockPayload.sessionId);
    expect(decoded.type).toBe('refresh');
  });

  it('should decode a token payload without verifying signature', async () => {
    const token = await jwtService.signAccessToken({
      ...mockPayload,
      type: 'access',
    });

    const decoded = jwtService.decodeToken<{ sub: string; role: string }>(token);
    expect(decoded.sub).toBe(mockPayload.sub);
    expect(decoded.role).toBe(mockPayload.role);
  });

  it('should reject verified access token signature when checked as refresh token', async () => {
    const token = await jwtService.signAccessToken({
      ...mockPayload,
      type: 'access',
    });

    await expect(jwtService.verifyRefreshToken(token)).rejects.toThrow(JwtInvalidError);
  });

  it('should throw JwtInvalidError for malformed tokens during verification', async () => {
    await expect(jwtService.verifyAccessToken('invalid.token.here')).rejects.toThrow(JwtInvalidError);
  });
});
