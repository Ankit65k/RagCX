import dotenv from 'dotenv';

// Load .env with override to handle omniroute's PORT variable
dotenv.config({ override: true });

export const env = {
  // App
  APP_PORT: process.env.APP_PORT || process.env.PORT || '3000',
  APP_ENV: process.env.APP_ENV || process.env.NODE_ENV || 'development',
  APP_HOST: process.env.APP_HOST || 'localhost',
  APP_API_PREFIX: process.env.APP_API_PREFIX || '/api',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || '6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: process.env.REDIS_DB || '0',

  // Auth
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '30d',

  // Storage
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
  STORAGE_LOCAL_PATH: process.env.STORAGE_LOCAL_PATH || './uploads',
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || '',
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || '',
  STORAGE_REGION: process.env.STORAGE_REGION || '',
  STORAGE_ACCESS_KEY_ID: process.env.STORAGE_ACCESS_KEY_ID || '',
  STORAGE_SECRET_ACCESS_KEY: process.env.STORAGE_SECRET_ACCESS_KEY || '',

  // Logger
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Rate Limiting
  BYPASS_RATE_LIMIT: process.env.BYPASS_RATE_LIMIT || 'false',

  // Upload
  UPLOAD_MAX_SIZE_BYTES: process.env.UPLOAD_MAX_SIZE_BYTES || '10485760',

  // Bcrypt
  BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS || '10',
} as const;

export default env;
