import type * as SentryNext from '@sentry/nextjs';
import { serverEnv } from './lib/env';

/** Server-side Sentry (Node and Edge runtimes). Off unless SENTRY_DSN is set. */
export async function register() {
  const { SENTRY_DSN } = serverEnv();
  if (!SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
  });
}

export async function onRequestError(...args: Parameters<typeof SentryNext.captureRequestError>) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
}
