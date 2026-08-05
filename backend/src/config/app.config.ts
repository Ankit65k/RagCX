import { env } from '../core/env/index.js';

export const appConfig = Object.freeze({
  port: env.APP_PORT,
  env: env.APP_ENV,
  host: env.APP_HOST,
  apiPrefix: env.APP_API_PREFIX,
});

export default appConfig;
