import { Role } from '@prisma/client';
import { Permission } from '../constants/auth.constants.js';

/**
 * Standard device tracking information for session management and auditing.
 */
export interface DeviceMetadata {
  deviceName?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Base JWT Token Payload template
 */
export interface TokenPayload {
  jti: string;           // Unique token identifier
  sub: string;           // Subject (User ID)
  role: Role;            // User role for fast authorization checks
  sessionId: string;     // Reference to the active Session ID
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Access Token Payload details
 */
export interface AccessTokenPayload extends TokenPayload {
  type: 'access';
}

/**
 * Refresh Token Payload details
 */
export interface RefreshTokenPayload extends TokenPayload {
  type: 'refresh';
}

/**
 * Standard security tokens returned to the client
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Sanitized profile representation of an authenticated user
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  permissions: Permission[];
}

/**
 * Standard response structure for successful authentication events (login, refresh)
 */
export interface AuthResponse {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}

/**
 * Detailed representation of an active session, exposing audit and tracking details
 */
export interface SessionInfo {
  id: string;
  userId: string;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  operatingSystem: string | null;
  ipAddress: string | null;
  lastActivity: Date;
  expiresAt: Date;
  isCurrent: boolean;
}
