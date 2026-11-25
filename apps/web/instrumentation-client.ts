import { publicEnv } from './lib/env';

// Browser Sentry, loaded lazily and only when a DSN is configured, so it costs nothing on the menu page otherwise.
const dsn = publicEnv.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  void import('@sentry/nextjs').then((Sentry) =>
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
      },
    }),
  );
}
