import jwt from 'jsonwebtoken';
import { authConfig } from '../../../config/auth.config.js';
import {
  JwtExpiredError,
  JwtInvalidError,
  JwtSignError,
} from './jwt.errors.js';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  JwtVerifyOptions,
} from './jwt.types.js';

export class JwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiration: string;
  private readonly refreshExpiration: string;

  constructor() {
    const { accessSecret, refreshSecret, accessExpiration, refreshExpiration } = authConfig.jwt;

    if (!accessSecret || accessSecret.length < 16) {
      throw new JwtSignError('Access token secret must be at least 16 characters long');
    }
    if (!refreshSecret || refreshSecret.length < 16) {
      throw new JwtSignError('Refresh token secret must be at least 16 characters long');
    }

    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.accessExpiration = accessExpiration;
    this.refreshExpiration = refreshExpiration;
  }

  /**
   * Generates a signed Access Token.
   */
  public async signAccessToken(
    payload: Omit<AccessTokenPayload, 'iat' | 'exp'>,
  ): Promise<string> {
    try {
      return new Promise<string>((resolve, reject) => {
        jwt.sign(
          payload,
          this.accessSecret,
          {
            expiresIn: this.accessExpiration as jwt.SignOptions['expiresIn'],
            algorithm: 'HS256',
          },
          (err, token) => {
            if (err || !token) {
              reject(new JwtSignError(err?.message || 'Access token signing failed'));
            } else {
              resolve(token);
            }
          },
        );
      });
    } catch (error) {
      if (error instanceof JwtSignError) throw error;
      throw new JwtSignError(error instanceof Error ? error.message : 'Unknown signing error');
    }
  }

  /**
   * Generates a signed Refresh Token.
   */
  public async signRefreshToken(
    payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>,
  ): Promise<string> {
    try {
      return new Promise<string>((resolve, reject) => {
        jwt.sign(
          payload,
          this.refreshSecret,
          {
            expiresIn: this.refreshExpiration as jwt.SignOptions['expiresIn'],
            algorithm: 'HS256',
          },
          (err, token) => {
            if (err || !token) {
              reject(new JwtSignError(err?.message || 'Refresh token signing failed'));
            } else {
              resolve(token);
            }
          },
        );
      });
    } catch (error) {
      if (error instanceof JwtSignError) throw error;
      throw new JwtSignError(error instanceof Error ? error.message : 'Unknown signing error');
    }
  }

  /**
   * Verifies and decodes an Access Token.
   */
  public async verifyAccessToken(
    token: string,
    options?: JwtVerifyOptions,
  ): Promise<AccessTokenPayload> {
    return new Promise<AccessTokenPayload>((resolve, reject) => {
      jwt.verify(
        token,
        this.accessSecret,
        {
          clockTolerance: options?.clockTolerance,
          algorithms: ['HS256'],
        },
        (err, decoded) => {
          if (err) {
            if (err.name === 'TokenExpiredError') {
              reject(new JwtExpiredError('Access token has expired'));
            } else {
              reject(new JwtInvalidError(err.message || 'Invalid access token'));
            }
          } else {
            resolve(decoded as AccessTokenPayload);
          }
        },
      );
    });
  }

  /**
   * Verifies and decodes a Refresh Token.
   */
  public async verifyRefreshToken(
    token: string,
    options?: JwtVerifyOptions,
  ): Promise<RefreshTokenPayload> {
    return new Promise<RefreshTokenPayload>((resolve, reject) => {
      jwt.verify(
        token,
        this.refreshSecret,
        {
          clockTolerance: options?.clockTolerance,
          algorithms: ['HS256'],
        },
        (err, decoded) => {
          if (err) {
            if (err.name === 'TokenExpiredError') {
              reject(new JwtExpiredError('Refresh token has expired'));
            } else {
              reject(new JwtInvalidError(err.message || 'Invalid refresh token'));
            }
          } else {
            resolve(decoded as RefreshTokenPayload);
          }
        },
      );
    });
  }

  /**
   * Decodes a token's payload without validating its signature or expiration.
   * Useful for reading metadata (e.g. jti, sub) from expired refresh tokens during rotation.
   */
  public decodeToken<T extends object>(token: string): T {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || typeof decoded === 'string') {
        throw new JwtInvalidError('Malformed token structure');
      }
      return decoded as T;
    } catch (error) {
      if (error instanceof JwtInvalidError) throw error;
      throw new JwtInvalidError(error instanceof Error ? error.message : 'Failed to decode token');
    }
  }
}
