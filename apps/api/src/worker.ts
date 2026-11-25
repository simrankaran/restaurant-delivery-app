import { Worker } from 'bullmq';
import { getEnv, loadDotEnv } from './config/env';
import { createProcessors } from './jobs/processors';
import { QUEUE_NAMES } from './jobs/queues';
import { createLogger } from './lib/logger';
import { createBullConnection } from './lib/redis';

loadDotEnv();
const env = getEnv();
const logger = createLogger(env.LOG_LEVEL, env.NODE_ENV === 'development').child({
  proc: 'worker',
});

const connection = createBullConnection(env.REDIS_URL, logger);
const processors = createProcessors(logger);

const workers = QUEUE_NAMES.map((name) => {
  const worker = new Worker(name, processors[name], { connection, concurrency: 5 });
  worker.on('failed', (job, err) => logger.error({ queue: name, id: job?.id, err }, 'job failed'));
  worker.on('error', (err) => logger.error({ queue: name, err: err.message }, 'worker error'));
  return worker;
});

logger.info(`Worker listening on ${workers.length} queues: ${QUEUE_NAMES.join(', ')}`);

async function shutdown(signal: string) {
  logger.info(`${signal} received, closing workers`);
  await Promise.allSettled(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
