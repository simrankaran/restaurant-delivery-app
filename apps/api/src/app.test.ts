import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { HealthChecks } from './modules/health/routes';

const up = async () => true;
const down = async () => false;
const app = (health: HealthChecks) => createApp({ corsOrigin: 'http://localhost:3000', health });

describe('GET /health', () => {
  it.each(['/health', '/api/health'])('%s is 200 when mongo and redis are up', async (path) => {
    const res = await request(app({ mongo: up, redis: up })).get(path);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', mongo: 'up', redis: 'up' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('is 503 with mongo down', async () => {
    const res = await request(app({ mongo: down, redis: up })).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', mongo: 'down', redis: 'up' });
  });

  it('treats a throwing check as down', async () => {
    const res = await request(
      app({ mongo: up, redis: () => Promise.reject(new Error('ECONNREFUSED')) }),
    ).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.redis).toBe('down');
  });

  it('treats a hanging check as down after the timeout', async () => {
    const hang = () => new Promise<boolean>(() => {});
    const res = await request(app({ mongo: hang, redis: up })).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.mongo).toBe('down');
  });
});

describe('app basics', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app({ mongo: up, redis: up })).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Not found/);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app({ mongo: up, redis: up }))
      .post('/api/anything')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
  });

  it('sets security headers and locks CORS to the web origin', async () => {
    const res = await request(app({ mongo: up, redis: up }))
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const other = await request(app({ mongo: up, redis: up }))
      .get('/api/health')
      .set('Origin', 'https://evil.example');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });
});
