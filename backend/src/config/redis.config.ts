import { env } from '../core/env/index.js';

export const redisConfig = Object.freeze({
  url: env.REDIS_URL,
});

export default redisConfig;
