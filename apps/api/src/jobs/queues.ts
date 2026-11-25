import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

/**
 * Background queues (BLUEPRINT "Realtime and background jobs"). The API adds jobs; worker.ts runs them.
 * - payments:      expire unpaid orders at 15 min (Session 4)
 * - escalations:   WhatsApp the owner at 2 and 5 min if an order isn't accepted (Session 5)
 * - notifications: WhatsApp sends with retry (Session 7)
 * - reports:       nightly sales summary to the owner (Session 7)
 */
export const QUEUE_NAMES = ['payments', 'escalations', 'notifications', 'reports'] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

const queues = new Map<QueueName, Queue>();

/** One Queue instance per name for the process, sharing the given BullMQ connection. */
export function getQueue(name: QueueName, connection: Redis): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection });
    queues.set(name, queue);
  }
  return queue;
}
