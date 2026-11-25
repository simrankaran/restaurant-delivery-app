/**
 * Preloaded with `--import` (see package.json) so Sentry can instrument express, mongoose and ioredis
 * before they are imported. Does nothing unless SENTRY_DSN is set.
 */
import * as Sentry from '@sentry/node';
import { loadDotEnv } from './config/env';

loadDotEnv();

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
    // Request bodies and headers carry phones, OTPs and tokens: collect none of it.
    // Tag the user id explicitly instead (Session 9), never the phone.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
  });
}
