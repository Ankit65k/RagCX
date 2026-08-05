import bcrypt from 'bcrypt';
import { IPasswordHasher } from '../interfaces/auth.interfaces.js';
import {
  PASSWORD_POLICY,
  PASSWORD_SECURITY_CONFIG,
} from '../constants/password.constants.js';
import {
  PasswordHashError,
  PasswordValidationError,
} from './password.errors.js';
import {
  PasswordStrength,
  PasswordValidationResult,
} from '../types/password.types.js';

export class PasswordService implements IPasswordHasher {
  private readonly saltRounds: number;

  constructor() {
    const envRounds = process.env.BCRYPT_SALT_ROUNDS;
    this.saltRounds = envRounds
      ? parseInt(envRounds, 10)
      : PASSWORD_SECURITY_CONFIG.DEFAULT_SALT_ROUNDS;

    if (isNaN(this.saltRounds) || this.saltRounds < 10 || this.saltRounds > 31) {
      this.saltRounds = PASSWORD_SECURITY_CONFIG.DEFAULT_SALT_ROUNDS;
    }
  }

  /**
   * Hashes a plain-text password using bcrypt.
   * Enforces policy check prior to hashing.
   */
  public async hash(password: string): Promise<string> {
    const policyResult = this.validatePasswordPolicy(password);
    if (!policyResult.isValid) {
      throw new PasswordValidationError(
        'Password does not meet validation policy requirements',
        policyResult.errors,
      );
    }

    try {
      const salt = await bcrypt.genSalt(this.saltRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new PasswordHashError(
        error instanceof Error ? error.message : 'Cryptographic hashing failed',
      );
    }
  }

  /**
   * Safe comparison of a plain-text password with a hash in constant time.
   */
  public async compare(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new PasswordHashError(
        error instanceof Error ? error.message : 'Hash comparison failed',
      );
    }
  }

  /**
   * Validates if a password complies with the strict security policy.
   */
  public validatePasswordPolicy(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password cannot be empty');
      return {
        isValid: false,
        errors,
        strength: 'VERY_WEAK',
      };
    }

    if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters long`);
    }

    if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
      errors.push(`Password cannot exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`);
    }

    if (PASSWORD_POLICY.REGEX_LEADING_SPACE.test(password)) {
      errors.push('Password cannot contain leading spaces');
    }

    if (PASSWORD_POLICY.REGEX_TRAILING_SPACE.test(password)) {
      errors.push('Password cannot contain trailing spaces');
    }

    if (!PASSWORD_POLICY.REGEX_UPPERCASE.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!PASSWORD_POLICY.REGEX_LOWERCASE.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!PASSWORD_POLICY.REGEX_NUMBER.test(password)) {
      errors.push('Password must contain at least one numeric digit');
    }

    if (!PASSWORD_POLICY.REGEX_SPECIAL_CHAR.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    const strength = this.determinePasswordStrength(password);

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * Analyzes password structure and returns a strength score.
   */
  public determinePasswordStrength(password: string): PasswordStrength {
    if (!password || password.length === 0) {
      return 'VERY_WEAK';
    }

    let score = 0;

    // Length score contribution
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character complexity contributions
    if (PASSWORD_POLICY.REGEX_UPPERCASE.test(password)) score += 1;
    if (PASSWORD_POLICY.REGEX_LOWERCASE.test(password)) score += 1;
    if (PASSWORD_POLICY.REGEX_NUMBER.test(password)) score += 1;
    if (PASSWORD_POLICY.REGEX_SPECIAL_CHAR.test(password)) score += 1;

    // Map score to classifications
    if (score <= 2) return 'VERY_WEAK';
    if (score === 3) return 'WEAK';
    if (score === 4) return 'MEDIUM';
    if (score === 5) return 'STRONG';
    return 'VERY_STRONG';
  }
}
