import { defineConfig } from 'vitest/config';

// `pnpm test` runs every workspace's suite; each package has its own vitest.config.ts.
export default defineConfig({
  test: {
    // Explicit list: apps/customer_app and apps/partner_app are Flutter, not Vitest projects.
    projects: ['packages/*', 'apps/api', 'apps/web'],
  },
});
