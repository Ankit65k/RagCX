export const RedisChannels = {
  CHAT_JOBS: 'chat:jobs',
  DOCUMENT_JOBS: 'document:jobs',
  SYSTEM_EVENTS: 'system:events',
} as const;

export type RedisChannel = typeof RedisChannels[keyof typeof RedisChannels];

export default RedisChannels;
