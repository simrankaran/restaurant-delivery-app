// PM2 process list for the production GCP VM (BLUEPRINT "Deployment").
// Build first: `pnpm build`. Env comes from apps/api/.env and apps/web/.env.local (or the shell).
module.exports = {
  apps: [
    {
      name: 'web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '700M',
    },
    {
      name: 'api',
      cwd: './apps/api',
      script: 'dist/server.js',
      node_args: '--import ./dist/instrument.js --enable-source-maps',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '500M',
      kill_timeout: 10000, // let in-flight requests and DB connections close
    },
    {
      name: 'worker',
      cwd: './apps/api',
      script: 'dist/worker.js',
      node_args: '--import ./dist/instrument.js --enable-source-maps',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '300M',
      kill_timeout: 30000, // let running jobs finish
    },
  ],
};
