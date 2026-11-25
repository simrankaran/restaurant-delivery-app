import { existsSync } from 'node:fs';
import { z } from 'zod';

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// or mongodb+srv:// URI'),
  REDIS_URL: z.string().regex(/^rediss?:\/\//, 'must be a redis:// or rediss:// URL'),
  WEB_ORIGIN: z.url(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.url().optional()),
});

export type Env = z.infer<typeof EnvSchema>;

/** Validates environment variables; throws one readable error listing every problem. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map(
      (i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    throw new Error(
      `Invalid environment configuration:\n${problems.join('\n')}\nSee apps/api/.env.example.`,
    );
  }
  return result.data;
}

/** Loads ./.env (if present) into process.env without overriding variables already set. */
export function loadDotEnv(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}

let cached: Env | undefined;

/** The validated environment for this process. Call loadDotEnv() first in entry points. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
