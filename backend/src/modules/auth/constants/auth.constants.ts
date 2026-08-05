/**
 * Authentication Cookie Names
 */
export const AUTH_COOKIE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

/**
 * Token Expiration Durations in milliseconds/seconds
 */
export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN_MS: 15 * 60 * 1000, // 15 minutes
  ACCESS_TOKEN_JWT: '15m',
  REFRESH_TOKEN_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  REFRESH_TOKEN_JWT: '7d',
} as const;

/**
 * Session Configuration Constants
 */
export const SESSION_CONFIG = {
  MAX_ACTIVE_SESSIONS_PER_USER: 5,
  INACTIVE_SESSION_TIMEOUT_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

/**
 * Granular application permissions
 */
export enum Permission {
  // User Management
  USERS_VIEW = 'users:view',
  USERS_MANAGE = 'users:manage',

  // Document Management
  DOCUMENTS_VIEW = 'documents:view',
  DOCUMENTS_UPLOAD = 'documents:upload',
  DOCUMENTS_DELETE = 'documents:delete',
  DOCUMENTS_PROCESS = 'documents:process',

  // Chat/Conversation Management
  CHAT_CREATE = 'chat:create',
  CHAT_VIEW = 'chat:view',
  CHAT_DELETE = 'chat:delete',

  // System/Admin Dashboard
  DASHBOARD_VIEW = 'dashboard:view',
  SYSTEM_SETTINGS = 'system:settings',
}

/**
 * Role to Permissions Mapping Definition
 */
export const ROLE_PERMISSIONS: Record<'ADMIN' | 'USER', Permission[]> = {
  ADMIN: Object.values(Permission),
  USER: [
    Permission.DOCUMENTS_VIEW,
    Permission.DOCUMENTS_UPLOAD,
    Permission.DOCUMENTS_DELETE,
    Permission.CHAT_CREATE,
    Permission.CHAT_VIEW,
    Permission.CHAT_DELETE,
  ],
};
