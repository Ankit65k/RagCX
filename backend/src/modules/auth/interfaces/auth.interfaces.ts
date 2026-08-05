import { Session } from '@prisma/client';
import {
  DeviceMetadata,
  AuthTokens,
  AuthResponse,
  AuthenticatedUser,
  SessionInfo,
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../types/auth.types.js';

/**
 * Contract for Password Hashing and Verification operations (SRP)
 */
export interface IPasswordHasher {
  /**
   * Hashes a plain-text password using a secure algorithm (e.g., bcrypt or argon2)
   */
  hash(password: string): Promise<string>;

  /**
   * Compares plain text password against a stored hash
   */
  compare(password: string, hash: string): Promise<boolean>;
}

/**
 * Contract for JWT generation, sign, and validation (SRP)
 */
export interface ITokenService {
  /**
   * Generates a pair of access and refresh tokens for a user session
   */
  generateTokenPair(userId: string, role: string, sessionId: string): Promise<AuthTokens>;

  /**
   * Verifies an access token string and extracts its payload
   */
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;

  /**
   * Verifies a refresh token string and extracts its payload
   */
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
}

/**
 * Contract for User session lifecycle management (SRP / ISP)
 * Tracks sessions, implements token rotation, and enforces concurrent session limits.
 */
export interface ISessionService {
  /**
   * Creates a new session tracking record for a logged-in user with their initial hashed refresh token.
   */
  createSession(userId: string, metadata: DeviceMetadata, refreshToken: string, sessionId?: string): Promise<Session>;

  /**
   * Validates and rotates an existing session, implementing Refresh Token Rotation (RTR).
   * Validates the session, verifies the hashed refresh token matches, rotates the token, and updates the DB.
   * Throws security error and revokes all active user sessions if reuse is detected.
   */
  rotateSession(
    sessionId: string,
    providedRefreshToken: string,
    newRefreshToken: string,
  ): Promise<Session>;

  /**
   * Returns session details by ID
   */
  getSessionById(sessionId: string): Promise<Session | null>;

  /**
   * Locates a session using a plain-text refresh token (hashes it internally to check)
   */
  findSessionByRefreshToken(refreshToken: string): Promise<Session | null>;

  /**
   * Verifies session exists, is not revoked, and is not expired.
   * Throws typed Session exceptions if checks fail.
   */
  verifySession(sessionId: string): Promise<Session>;

  /**
   * Updates a session's last activity timestamp, and optionally IP Address & User Agent
   */
  updateLastActivity(sessionId: string, ipAddress?: string, userAgent?: string): Promise<Session>;

  /**
   * Lists all active sessions for a user, highlighting the current session
   */
  getActiveSessions(userId: string, currentSessionId: string): Promise<SessionInfo[]>;

  /**
   * Revokes a specific session by ID (marks it revoked/deleted)
   */
  revokeSession(sessionId: string): Promise<void>;

  /**
   * Revokes all active sessions for a user (useful for security breaches or logout everywhere)
   */
  revokeAllUserSessions(userId: string): Promise<void>;

  /**
   * Purges or revokes expired sessions based on expiration time to keep DB size optimized.
   */
  cleanupExpiredSessions(): Promise<void>;
}

/**
 * Core Authentication service contract orchestrating Auth operations.
 */
export interface IAuthService {
  /**
   * Authenticates a user with credentials and registers a device/session
   */
  login(credentials: { email: string; password: string }, metadata: DeviceMetadata): Promise<AuthResponse>;

  /**
   * Logs out a specific session, invalidating the session in the database
   */
  logout(refreshToken: string): Promise<void>;

  /**
   * Performs refresh token rotation (RTR) to issue new access & refresh tokens
   */
  refresh(refreshToken: string): Promise<AuthTokens>;

  /**
   * Retrieves profile info and permissions of the currently authenticated user
   */
  getCurrentUser(userId: string): Promise<AuthenticatedUser>;

  /**
   * Registers a new user account with default role USER.
   */
  register(data: { email: string; password: string }): Promise<AuthenticatedUser>;
}
