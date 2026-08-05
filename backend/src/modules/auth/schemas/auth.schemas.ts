import { z } from 'zod';
import { PASSWORD_POLICY } from '../constants/password.constants.js';

/**
 * JWT Regex validation check (header.payload.signature)
 */
export const JwtRegex = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;

/**
 * Reusable, strict Email validation schema.
 */
export const EmailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Invalid email address format')
  .max(255, 'Email cannot exceed 255 characters');

/**
 * Reusable, strict Password complexity validation schema.
 */
export const PasswordSchema = z
  .string({ required_error: 'Password is required' })
  .min(PASSWORD_POLICY.MIN_LENGTH, `Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters long`)
  .max(PASSWORD_POLICY.MAX_LENGTH, `Password cannot exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`)
  .refine((val) => !PASSWORD_POLICY.REGEX_LEADING_SPACE.test(val), {
    message: 'Password cannot contain leading spaces',
  })
  .refine((val) => !PASSWORD_POLICY.REGEX_TRAILING_SPACE.test(val), {
    message: 'Password cannot contain trailing spaces',
  })
  .refine((val) => PASSWORD_POLICY.REGEX_UPPERCASE.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => PASSWORD_POLICY.REGEX_LOWERCASE.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => PASSWORD_POLICY.REGEX_NUMBER.test(val), {
    message: 'Password must contain at least one numeric digit',
  })
  .refine((val) => PASSWORD_POLICY.REGEX_SPECIAL_CHAR.test(val), {
    message: 'Password must contain at least one special character',
  });

/**
 * Reusable JWT token schema.
 */
export const JwtSchema = z
  .string({ required_error: 'Token is required' })
  .regex(JwtRegex, 'Invalid token format');

/**
 * Schema validating User credentials on Login.
 */
export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

/**
 * Schema validating Refresh Token payload request body or cookies.
 */
export const RefreshTokenSchema = z.object({
  refreshToken: JwtSchema,
});

/**
 * Schema validating Logout request body or cookies.
 */
export const LogoutSchema = z.object({
  refreshToken: JwtSchema,
});

/**
 * Schema validating Logout All Devices requests (should not contain any request body).
 */
export const LogoutAllSchema = z.object({}).strict();

/**
 * Schema validating Current User request payloads (should not contain any request body).
 */
export const CurrentUserSchema = z.object({}).strict();

// Export inferred types for all schemas to keep controllers strongly typed
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type LogoutInput = z.infer<typeof LogoutSchema>;
export type LogoutAllInput = z.infer<typeof LogoutAllSchema>;
export type CurrentUserInput = z.infer<typeof CurrentUserSchema>;
export type EmailInput = z.infer<typeof EmailSchema>;
export type PasswordInput = z.infer<typeof PasswordSchema>;

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: z.string({ required_error: 'Confirm password is required' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
