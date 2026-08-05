/**
 * Strict Password Policy Configuration Constants
 */
export const PASSWORD_POLICY = {
  MIN_LENGTH: 12,
  MAX_LENGTH: 128,
  
  // Complexity Validation Patterns
  REGEX_UPPERCASE: /[A-Z]/,
  REGEX_LOWERCASE: /[a-z]/,
  REGEX_NUMBER: /[0-9]/,
  REGEX_SPECIAL_CHAR: /[^A-Za-z0-9]/,
  
  // Rejection rules
  REGEX_LEADING_SPACE: /^\s/,
  REGEX_TRAILING_SPACE: /\s$/,
} as const;

/**
 * Standard configuration for bcrypt salt computation
 */
export const PASSWORD_SECURITY_CONFIG = {
  DEFAULT_SALT_ROUNDS: 12,
} as const;
