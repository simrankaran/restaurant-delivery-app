import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    worker: 'src/worker.ts',
    instrument: 'src/instrument.ts', // loaded with `node --import` so Sentry patches express before it is imported
  },
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  sourcemap: true,
  clean: true,
  // @restaurant/shared ships TypeScript source, so bundle it; everything else stays in node_modules.
  noExternal: [/^@restaurant\//],
});
