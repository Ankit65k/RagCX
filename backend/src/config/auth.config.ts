import { env } from '../core/env/index.js';

export const authConfig = Object.freeze({
  jwt: Object.freeze({
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiration: env.JWT_ACCESS_EXPIRATION,
    refreshExpiration: env.JWT_REFRESH_EXPIRATION,
  }),
});

export default authConfig;
