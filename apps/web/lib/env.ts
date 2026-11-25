import { z } from 'zod';

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

/**
 * Browser-safe config. Next only inlines NEXT_PUBLIC_* values referenced literally,
 * so each one is read by name below rather than by spreading process.env.
 */
export const publicEnv = z
  .object({
    NEXT_PUBLIC_SITE_NAME: z.string().min(1).default('Restaurant'),
    NEXT_PUBLIC_SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
  })
  .parse({
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

/** Server-only config. Import only from server components, route handlers and instrumentation. */
export function serverEnv() {
  return z
    .object({
      API_INTERNAL_URL: z.url().default('http://localhost:4000'),
      SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
    })
    .parse({ API_INTERNAL_URL: process.env.API_INTERNAL_URL, SENTRY_DSN: process.env.SENTRY_DSN });
}
