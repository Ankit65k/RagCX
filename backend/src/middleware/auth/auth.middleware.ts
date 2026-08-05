import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { JwtService } from '../../modules/auth/jwt/jwt.service.js';
import { SessionService } from '../../modules/sessions/services/session.service.js';
import SessionRepository from '../../modules/sessions/repositories/session.repository.js';
import UserRepository from '../../modules/users/repositories/user.repository.js';
import { PasswordService } from '../../modules/auth/utils/password.service.js';
import { logger } from '../../infrastructure/logger/logger.js';
import { Permission, ROLE_PERMISSIONS, AUTH_COOKIE_KEYS } from '../../modules/auth/constants/auth.constants.js';
import {
  UnauthorizedError,
  ForbiddenError,
  InvalidTokenError,
  SessionExpiredError,
  SessionRevokedError,
  InactiveUserError,
} from '../../modules/auth/errors/auth.errors.js';

// Instantiate infrastructure classes
const jwtService = new JwtService();
const passwordService = new PasswordService();
const sessionRepository = new SessionRepository();
const sessionService = new SessionService(sessionRepository, passwordService, logger);
const userRepository = new UserRepository();

/**
 * Extracts access token from Authorization header or cookies.
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  if (req.cookies && req.cookies[AUTH_COOKIE_KEYS.ACCESS_TOKEN]) {
    return req.cookies[AUTH_COOKIE_KEYS.ACCESS_TOKEN];
  }
  return null;
};

/**
 * Core validation logic to verify access token and load session/user details.
 */
const validateAuthentication = async (req: Request, token: string): Promise<void> => {
  let payload;
  try {
    payload = await jwtService.verifyAccessToken(token);
  } catch (err) {
    logger.warn({ ip: req.ip }, 'Invalid access token signature or format');
    throw new InvalidTokenError();
  }

  // 1. Load and verify user
  const user = await userRepository.findById(payload.sub);
  if (!user) {
    logger.warn({ userId: payload.sub }, 'Authenticated user not found in database');
    throw new UnauthorizedError();
  }

  if (!user.isActive) {
    logger.warn({ userId: user.id }, 'Inactive user attempted access');
    throw new InactiveUserError();
  }

  // 2. Load and verify session
  const session = await sessionService.getSessionById(payload.sessionId);
  if (!session) {
    logger.warn({ sessionId: payload.sessionId }, 'Session associated with token not found');
    throw new UnauthorizedError('Session not found');
  }

  if (session.isRevoked) {
    logger.warn({ sessionId: session.id, userId: user.id }, 'Revoked session attempted access');
    throw new SessionRevokedError();
  }

  if (session.expiresAt < new Date()) {
    logger.warn({ sessionId: session.id, userId: user.id }, 'Expired session attempted access');
    throw new SessionExpiredError();
  }

  // 3. Attach authentication details to request
  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: ROLE_PERMISSIONS[user.role] || [],
  };
  req.session = session;
  req.sessionId = session.id;
  req.permissions = ROLE_PERMISSIONS[user.role] || [];
  req.role = user.role;
};

/**
 * requireAuth: Protects routes, rejecting any request without valid access tokens.
 */
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      logger.warn({ ip: req.ip, path: req.path }, 'Missing Authorization Header or Cookie');
      throw new UnauthorizedError('Authentication token is required');
    }

    await validateAuthentication(req, token);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * optionalAuth: Attaches user context if a token is present, but skips verification if missing.
 * Reject only when a token is provided but is invalid/expired/revoked.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    await validateAuthentication(req, token);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role Guard: Ensures the authenticated user possesses one of the allowed roles.
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = req.role || req.user?.role;

    if (!userRole) {
      logger.warn({ ip: req.ip, path: req.path }, 'Role check failed: Unauthenticated request');
      return next(new UnauthorizedError());
    }

    if (!allowedRoles.includes(userRole)) {
      logger.warn(
        { userId: req.user?.id, role: userRole, allowedRoles, path: req.path },
        'Forbidden request: user role is not authorized',
      );
      return next(new ForbiddenError('You do not have the required role to access this resource'));
    }

    next();
  };
};

/**
 * Permission Guard: Ensures the authenticated user possesses all specified permissions.
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userPermissions = req.permissions || req.user?.permissions;

    if (!userPermissions) {
      logger.warn({ ip: req.ip, path: req.path }, 'Permission check failed: Unauthenticated request');
      return next(new UnauthorizedError());
    }

    const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));

    if (!hasAll) {
      logger.warn(
        { userId: req.user?.id, userPermissions, requiredPermissions, path: req.path },
        'Forbidden request: missing required permissions',
      );
      return next(new ForbiddenError('You do not have the required permissions to access this resource'));
    }

    next();
  };
};

export default requireAuth;
