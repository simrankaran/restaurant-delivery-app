import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const valid = {
  MONGO_URI: 'mongodb://localhost:27017/restaurant?directConnection=true',
  REDIS_URL: 'redis://localhost:6379',
  WEB_ORIGIN: 'http://localhost:3000',
};

describe('parseEnv', () => {
  it('accepts a minimal valid environment and applies defaults', () => {
    const env = parseEnv(valid);
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.TRUST_PROXY).toBe(0);
    expect(env.SENTRY_DSN).toBeUndefined();
  });

  it('coerces numeric strings', () => {
    expect(parseEnv({ ...valid, PORT: '8080', TRUST_PROXY: '1' })).toMatchObject({
      PORT: 8080,
      TRUST_PROXY: 1,
    });
  });

  it('treats an empty SENTRY_DSN as unset', () => {
    expect(parseEnv({ ...valid, SENTRY_DSN: '' }).SENTRY_DSN).toBeUndefined();
  });

  it('lists every missing or invalid variable in one error', () => {
    expect(() => parseEnv({ REDIS_URL: 'http://nope', WEB_ORIGIN: 'not a url' })).toThrowError(
      /MONGO_URI[\s\S]*REDIS_URL[\s\S]*WEB_ORIGIN/,
    );
  });

  it('accepts Atlas SRV URIs and TLS Redis', () => {
    expect(() =>
      parseEnv({
        ...valid,
        MONGO_URI: 'mongodb+srv://u:p@cluster0.x.mongodb.net/db',
        REDIS_URL: 'rediss://h:6380',
      }),
    ).not.toThrow();
  });
});
