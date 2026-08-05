import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../services/auth.service.js';
import UserRepository from '../../users/repositories/user.repository.js';
import SessionRepository from '../../sessions/repositories/session.repository.js';
import { SessionService } from '../../sessions/services/session.service.js';
import { JwtService } from '../jwt/jwt.service.js';
import { PasswordService } from '../utils/password.service.js';
import { logger } from '../../../infrastructure/logger/logger.js';
import { ApiResponse } from '../../../common/responses/api-response.js';
import { AUTH_COOKIE_KEYS, TOKEN_EXPIRATION } from '../constants/auth.constants.js';
import { InvalidRefreshTokenError, UnauthorizedError } from '../errors/auth.errors.js';
import { DeviceMetadata } from '../types/auth.types.js';

// Instantiate dependency hierarchy
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

export class AuthController {
  /**
   * Helper to parse user-agent headers into structured Browser / OS names.
   */
  private parseUserAgent(userAgent: string | undefined): Partial<DeviceMetadata> {
    if (!userAgent) {
      return { browser: 'Unknown', operatingSystem: 'Unknown', deviceName: 'Unknown Device' };
    }

    let browser = 'Unknown';
    let operatingSystem = 'Unknown';

    // Basic Browser Detection
    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Basic OS Detection
    if (userAgent.includes('Windows')) operatingSystem = 'Windows';
    else if (userAgent.includes('Macintosh')) operatingSystem = 'macOS';
    else if (userAgent.includes('Linux')) operatingSystem = 'Linux';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) operatingSystem = 'iOS';
    else if (userAgent.includes('Android')) operatingSystem = 'Android';

    const deviceName = `${operatingSystem} (${browser})`;

    return {
      browser,
      operatingSystem,
      deviceName,
      deviceType: /Mobile|Android|iPhone|iPad/i.test(userAgent) ? 'Mobile' : 'Desktop',
    };
  }

  /**
   * Helper to write tokens securely as HttpOnly cookies.
   */
  private setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(AUTH_COOKIE_KEYS.ACCESS_TOKEN, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRATION.ACCESS_TOKEN_MS,
    });

    res.cookie(AUTH_COOKIE_KEYS.REFRESH_TOKEN, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRATION.REFRESH_TOKEN_MS, // Kept aligned with refresh rotation lifecycle
    });
  }

  /**
   * Helper to purge authentication cookies.
   */
  private clearTokenCookies(res: Response): void {
    res.clearCookie(AUTH_COOKIE_KEYS.ACCESS_TOKEN);
    res.clearCookie(AUTH_COOKIE_KEYS.REFRESH_TOKEN);
  }

  /**
   * POST /api/v1/auth/register
   * Registers a new standard user with default USER role.
   */
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info({ ip: req.ip }, 'Incoming Request: POST /auth/register');
      const { email, password } = req.body;

      const user = await authService.register({ email, password });

      logger.info({ userId: user.id }, 'Successful Response: User registered');

      ApiResponse.success(res, user, 'User registration successful', 201);
    } catch (error) {
      logger.error({ error }, 'Controller Error: Registration failed');
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   * Handles credential matching, session allocation, and token issuance.
   */
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info({ ip: req.ip }, 'Incoming Request: POST /auth/login');
      const { email, password } = req.body;

      const userAgent = req.headers['user-agent'];
      const deviceMeta = this.parseUserAgent(userAgent);
      
      const clientMetadata: DeviceMetadata = {
        ...deviceMeta,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'Unknown',
        userAgent: userAgent || 'Unknown',
      };

      const result = await authService.login({ email, password }, clientMetadata);

      // Set cookie parameters for web clients
      this.setTokenCookies(res, result.tokens.accessToken, result.tokens.refreshToken);

      logger.info({ userId: result.user.id }, 'Successful Response: User authenticated');

      ApiResponse.success(res, result, 'Login successful', 200);
    } catch (error) {
      logger.error({ error }, 'Controller Error: Login failed');
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Performs refresh token rotation (RTR) to issue new token pairs.
   */
  public async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Incoming Request: POST /auth/refresh');
      
      // Pull refresh token from cookie or body
      const refreshToken = req.cookies[AUTH_COOKIE_KEYS.REFRESH_TOKEN] || req.body.refreshToken;

      if (!refreshToken) {
        throw new InvalidRefreshTokenError('Refresh token is missing');
      }

      const tokens = await authService.refresh(refreshToken);

      // Set new rotated cookies
      this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

      logger.info('Successful Response: Tokens rotated');

      ApiResponse.success(res, tokens, 'Token refreshed successfully', 200);
    } catch (error) {
      logger.error({ error }, 'Controller Error: Token refresh failed');
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Destroys current active session.
   */
  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Incoming Request: POST /auth/logout');
      
      const refreshToken = req.cookies[AUTH_COOKIE_KEYS.REFRESH_TOKEN] || req.body.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      this.clearTokenCookies(res);

      logger.info('Successful Response: Session destroyed');

      ApiResponse.success(res, {}, 'Logout successful', 200);
    } catch (error) {
      logger.error({ error }, 'Controller Error: Logout failed');
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout-all
   * Terminates all active sessions for the current authenticated user context.
   */
  public async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info({ userId: req.user?.id }, 'Incoming Request: POST /auth/logout-all');
      
      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError();
      }

      await authService.revokeAllUserSessions(userId);
      this.clearTokenCookies(res);

      logger.info({ userId }, 'Successful Response: All sessions revoked');

      ApiResponse.success(res, {}, 'Logout from all devices successful', 200);
    } catch (error) {
      logger.error({ error }, 'Controller Error: Logout all failed');
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   * Retrieves profile details and permissions of the currently logged-in user.
   */
  public async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info({ userId: req.user?.id }, 'Incoming Request: GET /auth/me');
      
      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError();
      }

      const user = await authService.getCurrentUser(userId);

      logger.info({ userId }, 'Successful Response: Current user retrieved');

      ApiResponse.success(res, user, 'Current user profile retrieved successfully', 200);
    } catch (error) {
      logger.error({ error }, 'Controller Error: Get current user failed');
      next(error);
    }
  }
}

export default AuthController;
