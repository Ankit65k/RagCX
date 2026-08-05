/**
 * Password Strength Classification
 */
export type PasswordStrength = 'VERY_WEAK' | 'WEAK' | 'MEDIUM' | 'STRONG' | 'VERY_STRONG';

/**
 * Result returned by the password validation engine
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: PasswordStrength;
}
