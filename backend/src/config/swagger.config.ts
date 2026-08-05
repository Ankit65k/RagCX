import { env } from '../core/env/index.js';

export const swaggerConfig = Object.freeze({
  path: env.SWAGGER_PATH,
  enabled: env.SWAGGER_ENABLED,
});

export default swaggerConfig;
