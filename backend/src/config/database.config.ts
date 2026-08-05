import { env } from '../core/env/index.js';

export const databaseConfig = Object.freeze({
  url: env.DATABASE_URL,
});

export default databaseConfig;
