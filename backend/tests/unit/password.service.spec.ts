import { describe, it, expect } from 'vitest';
import { PasswordService } from '../../src/modules/auth/utils/password.service.js';
import { PasswordValidationError } from '../../src/modules/auth/utils/password.errors.js';

describe('PasswordService Unit Tests', () => {
  const passwordService = new PasswordService();

  const validPassword = 'SecureP@ss1234';
  const weakPassword = 'password';

  it('should successfully validate a strong password according to policy rules', () => {
    const result = passwordService.validatePasswordPolicy(validPassword);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.strength).toBe('STRONG');
  });

  it('should catch policy errors for a weak password', () => {
    const result = passwordService.validatePasswordPolicy(weakPassword);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.strength).toBe('VERY_WEAK');
  });

  it('should reject passwords with leading or trailing spaces', () => {
    const result1 = passwordService.validatePasswordPolicy(' ' + validPassword);
    expect(result1.isValid).toBe(false);
    expect(result1.errors).toContain('Password cannot contain leading spaces');

    const result2 = passwordService.validatePasswordPolicy(validPassword + ' ');
    expect(result2.isValid).toBe(false);
    expect(result2.errors).toContain('Password cannot contain trailing spaces');
  });

  it('should successfully hash and compare a valid password', async () => {
    const hash = await passwordService.hash(validPassword);
    expect(hash).toBeDefined();
    expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix

    const isMatch = await passwordService.compare(validPassword, hash);
    expect(isMatch).toBe(true);

    const isMismatch = await passwordService.compare('WrongPassword123!', hash);
    expect(isMismatch).toBe(false);
  });

  it('should throw PasswordValidationError if attempting to hash an invalid policy password', async () => {
    await expect(passwordService.hash(weakPassword)).rejects.toThrow(PasswordValidationError);
  });
});
