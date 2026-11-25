import { Redis, type RedisOptions } from 'ioredis';
import type { Logger } from './logger';

/**
 * General-purpose client for the API (health, cache, rate limits, rider location).
 * enableOfflineQueue=false makes commands fail fast while Redis is down instead of hanging.
 */
export function createRedis(url: string, logger: Logger, options: RedisOptions = {}): Redis {
  const client = new Redis(url, { enableOfflineQueue: false, maxRetriesPerRequest: 1, ...options });
  let lastError = 0;
  client.on('ready', () => logger.info('Redis connected'));
  client.on('error', (err) => {
    // ioredis retries forever; log at most once every 30 s so a dead Redis doesn't flood the logs.
    if (Date.now() - lastError > 30_000) logger.error({ err: err.message }, 'Redis error');
    lastError = Date.now();
  });
  return client;
}

/**
 * Connection for BullMQ queues and workers. BullMQ requires maxRetriesPerRequest=null
 * and needs the offline queue so jobs added during a blip are not lost.
 */
export function createBullConnection(url: string, logger: Logger): Redis {
  return createRedis(url, logger, { enableOfflineQueue: true, maxRetriesPerRequest: null });
}

export async function pingRedis(client: Redis): Promise<boolean> {
  return (await client.ping()) === 'PONG';
}
