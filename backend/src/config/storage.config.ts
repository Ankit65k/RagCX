import { env } from '../core/env/index.js';

export const storageConfig = Object.freeze({
  provider: env.STORAGE_PROVIDER,
  localPath: env.STORAGE_LOCAL_PATH,
  s3: Object.freeze({
    bucket: env.STORAGE_BUCKET,
    endpoint: env.STORAGE_ENDPOINT,
    region: env.STORAGE_REGION,
    credentials: Object.freeze({
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    }),
  }),
});

export default storageConfig;
