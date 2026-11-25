import { Router } from 'express';
import { withTimeout } from '../../lib/timeout';

export type HealthCheck = () => Promise<boolean>;

export interface HealthChecks {
  mongo: HealthCheck;
  redis: HealthCheck;
}

const CHECK_TIMEOUT_MS = 1500;

async function run(check: HealthCheck): Promise<'up' | 'down'> {
  try {
    return (await withTimeout(check(), CHECK_TIMEOUT_MS, 'health check')) ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

/** GET /health — 200 only when MongoDB and Redis both answer; 503 otherwise. Used by the uptime ping. */
export function healthRouter(checks: HealthChecks): Router {
  const router = Router();
  router.get('/health', async (_req, res) => {
    const [mongo, redis] = await Promise.all([run(checks.mongo), run(checks.redis)]);
    const ok = mongo === 'up' && redis === 'up';
    res
      .status(ok ? 200 : 503)
      .set('Cache-Control', 'no-store')
      .json({ status: ok ? 'ok' : 'degraded', mongo, redis, uptime: Math.round(process.uptime()) });
  });
  return router;
}
