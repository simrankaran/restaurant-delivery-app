import * as Sentry from '@sentry/node';
import cors from 'cors';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { errorHandler, notFound } from './lib/http-error';
import type { Logger } from './lib/logger';
import { healthRouter, type HealthChecks } from './modules/health/routes';

export interface AppDeps {
  /** Allowed browser origin(s); CORS is locked to these. */
  corsOrigin: string | string[];
  health: HealthChecks;
  logger?: Logger;
  /** Number of reverse proxies in front of the app (1 behind Nginx). */
  trustProxy?: number;
}

/**
 * Builds the Express app without listening, so tests can drive it with supertest.
 * Feature routers mount on `api` below as each session adds a module.
 */
export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  if (deps.trustProxy) app.set('trust proxy', deps.trustProxy);

  app.use(helmet());
  // An array makes cors match each request's Origin and omit the header for anything else
  // (a plain string would be echoed to every caller).
  const allowedOrigins = Array.isArray(deps.corsOrigin) ? deps.corsOrigin : [deps.corsOrigin];
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  if (deps.logger)
    app.use(
      pinoHttp({ logger: deps.logger, autoLogging: { ignore: (req) => req.url === '/health' } }),
    );

  const health = healthRouter(deps.health);
  app.use(health); // GET /health for the uptime ping

  const api = express.Router();
  api.use(
    rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }),
  );
  api.use(health); // GET /api/health, reachable through Nginx and the Next dev rewrite
  // Session 1+: api.use('/auth', authRouter), api.use('/menu', menuRouter), ...
  app.use('/api', api);

  app.use(notFound);
  if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler(deps.logger));
  return app;
}
