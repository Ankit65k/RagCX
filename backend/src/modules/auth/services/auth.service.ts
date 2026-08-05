import crypto from 'crypto';
import { Logger } from 'pino';
import UserRepository from '../../users/repositories/user.repository.js';
import { JwtService } from '../jwt/jwt.service.js';
import { PasswordService } from '../utils/password.service.js';
import { IAuthService, ISessionService } from '../interfaces/auth.interfaces.js';
import { ROLE_PERMISSIONS } from '../constants/auth.constants.js';
import {
  DeviceMetadata,
  AuthTokens,
  AuthResponse,
  AuthenticatedUser,
} from '../types/auth.types.js';
import {
  InvalidCredentialsError,
  InactiveUserError,
  InvalidRefreshTokenError,
  UnauthorizedError,
  EmailAlreadyInUseError,
} from '../errors/auth.errors.js';

export class AuthenticationService implements IAuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionService: ISessionService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly logger: Logger,
  ) {}

  /**
   * Registers a new user account with default role USER.
   */
  public async register(data: { email: string; password: string }): Promise<AuthenticatedUser> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      this.logger.warn({ email: data.email }, 'Registration failed: email already in use');
      throw new EmailAlreadyInUseError();
    }

    const passwordHash = await this.passwordService.hash(data.password);
    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      role: 'USER',
      isActive: true,
    });

    this.logger.info({ userId: user.id, email: user.email }, 'Successful user registration');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
    };
  }

  /**
   * Authenticates a user, starts a tracking session, generates access/refresh tokens.
   */
  public async login(
    credentials: { email: string; password: string },
    metadata: DeviceMetadata,
  ): Promise<AuthResponse> {
    const { email, password } = credentials;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      this.logger.warn({ email, ipAddress: metadata.ipAddress }, 'Failed login attempt: user not found');
      throw new InvalidCredentialsError();
    }

    if (!user.isActive) {
      this.logger.warn({ userId: user.id, email, ipAddress: metadata.ipAddress }, 'Failed login attempt: inactive user account');
      throw new InactiveUserError();
    }

    const isPasswordValid = await this.passwordService.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn({ userId: user.id, email, ipAddress: metadata.ipAddress }, 'Failed login attempt: incorrect password');
      throw new InvalidCredentialsError();
    }

    const sessionId = crypto.randomUUID();
    const tokenVersion = 1;

    const accessToken = await this.jwtService.signAccessToken({
      sub: user.id,
      role: user.role,
      sessionId,
      tokenVersion,
      jti: crypto.randomUUID(),
      type: 'access',
    });

    const refreshToken = await this.jwtService.signRefreshToken({
      sub: user.id,
      sessionId,
      tokenVersion,
      jti: crypto.randomUUID(),
      type: 'refresh',
    });

    // Create the session in database directly with the pre-generated sessionId and refresh token
    await this.sessionService.createSession(user.id, metadata, refreshToken, sessionId);

    this.logger.info({ userId: user.id, sessionId, ipAddress: metadata.ipAddress }, 'Successful login');

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
    };

    return {
      user: authenticatedUser,
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Refreshes access and refresh tokens implementing One-Time Refresh Token Rotation (RTR).
   */
  public async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = await this.jwtService.verifyRefreshToken(refreshToken);
    } catch (error) {
      this.logger.warn({ error }, 'Invalid token refresh request: signature check failed');
      throw new InvalidRefreshTokenError();
    }

    // Check user state
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new InactiveUserError();
    }

    // Generate rotated tokens
    const tokenVersion = payload.tokenVersion;
    const newAccessToken = await this.jwtService.signAccessToken({
      sub: user.id,
      role: user.role,
      sessionId: payload.sessionId,
      tokenVersion,
      jti: crypto.randomUUID(),
      type: 'access',
    });

    const newRefreshToken = await this.jwtService.signRefreshToken({
      sub: user.id,
      sessionId: payload.sessionId,
      tokenVersion,
      jti: crypto.randomUUID(),
      type: 'refresh',
    });

    // Delegate database updates, rotation checks, and reuse security to SessionService
    await this.sessionService.rotateSession(payload.sessionId, refreshToken, newRefreshToken);

    this.logger.info({ userId: user.id, sessionId: payload.sessionId }, 'Successful token refresh');

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logs out user session by verifying the token and revoking it.
   */
  public async logout(refreshToken: string): Promise<void> {
    let payload;
    try {
      payload = await this.jwtService.verifyRefreshToken(refreshToken);
    } catch {
      try {
        // Fallback to decode to allow logout on expired tokens
        payload = this.jwtService.decodeToken<{ sessionId: string }>(refreshToken);
      } catch (error) {
        this.logger.warn({ error }, 'Failed to parse token during logout');
        throw new InvalidRefreshTokenError();
      }
    }

    if (payload && payload.sessionId) {
      await this.sessionService.revokeSession(payload.sessionId);
      this.logger.info({ sessionId: payload.sessionId }, 'Successful session logout');
    }
  }

  /**
   * Revokes all sessions belonging to the user.
   */
  public async revokeAllUserSessions(userId: string): Promise<void> {
    await this.sessionService.revokeAllUserSessions(userId);
    this.logger.info({ userId }, 'Revoked all sessions for user');
  }

  /**
   * Returns current profile details of the user.
   */
  public async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.warn({ userId }, 'Load user failed: user not found');
      throw new UnauthorizedError('User profile not found');
    }

    if (!user.isActive) {
      this.logger.warn({ userId }, 'Load user failed: account inactive');
      throw new InactiveUserError();
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
    };
  }
}
export default AuthenticationService;
