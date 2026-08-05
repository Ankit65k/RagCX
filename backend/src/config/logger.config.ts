import { env } from '../core/env/index.js';

export const loggerConfig = Object.freeze({
  level: env.LOG_LEVEL,
});

export default loggerConfig;
