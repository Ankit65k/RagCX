export interface BaseRedisEvent<T = unknown> {
  version: string;
  requestId: string;
  timestamp: string;
  type: string;
  payload: T;
}

export class RedisEventFactory {
  public static createEvent<T>(
    type: string,
    payload: T,
    requestId: string,
    version = '1.0',
  ): BaseRedisEvent<T> {
    return {
      version,
      requestId,
      timestamp: new Date().toISOString(),
      type,
      payload,
    };
  }
}
