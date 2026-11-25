import { createApp } from './app';
import { getEnv, loadDotEnv } from './config/env';
import { createLogger } from './lib/logger';
import { connectMongo, disconnectMongo, pingMongo } from './lib/mongo';
import { createRedis, pingRedis } from './lib/redis';

loadDotEnv();
const env = getEnv();
const logger = createLogger(env.LOG_LEVEL, env.NODE_ENV === 'development');

const redis = createRedis(env.REDIS_URL, logger);
void connectMongo(env.MONGO_URI, logger);

const app = createApp({
  corsOrigin: env.WEB_ORIGIN,
  trustProxy: env.TRUST_PROXY,
  logger,
  health: { mongo: pingMongo, redis: () => pingRedis(redis) },
});

const server = app.listen(env.PORT, () =>
  logger.info(`API listening on http://localhost:${env.PORT}`),
);

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close();
  await Promise.allSettled([disconnectMongo(), redis.quit()]);
  process.exit(0);
}
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
