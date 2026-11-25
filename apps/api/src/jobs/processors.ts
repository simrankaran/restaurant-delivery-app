import type { Job } from 'bullmq';
import type { Logger } from '../lib/logger';
import type { QueueName } from './queues';

export type Processor = (job: Job) => Promise<unknown>;

/**
 * Placeholder processors: they log and finish. Each is replaced in the session that owns the queue
 * (payments: 4, escalations: 5, notifications and reports: 7), in its own file under src/jobs/.
 */
export function createProcessors(logger: Logger): Record<QueueName, Processor> {
  const noop =
    (queue: QueueName): Processor =>
    async (job) => {
      logger.info({ queue, job: job.name, id: job.id }, 'job received (no processor yet)');
    };
  return {
    payments: noop('payments'),
    escalations: noop('escalations'),
    notifications: noop('notifications'),
    reports: noop('reports'),
  };
}
