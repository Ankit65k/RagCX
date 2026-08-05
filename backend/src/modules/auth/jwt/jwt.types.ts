import { Role } from '@prisma/client';

/**
 * Base JWT Claims as defined by RFC 7519
 */
export interface BaseJwtClaims {
  jti: string;       // Unique Token Identifier
  sub: string;       // Subject (User ID)
  iat?: number;      // Issued At
  exp?: number;      // Expiry Time
}

/**
 * Payload structure for an Access Token
 */
export interface AccessTokenPayload extends BaseJwtClaims {
  role: Role;        // User Authorization Role
  sessionId: string; // Active Database Session Reference
  tokenVersion: number; // For Token Versioning/Invalidation
  type: 'access';
}

/**
 * Payload structure for a Refresh Token
 */
export interface RefreshTokenPayload extends BaseJwtClaims {
  sessionId: string; // Active Database Session Reference
  tokenVersion: number; // For Token Versioning/Invalidation
  type: 'refresh';
}

/**
 * Verification configuration options
 */
export interface JwtVerifyOptions {
  clockTolerance?: number; // In seconds
}
