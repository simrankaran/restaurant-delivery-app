import type { NextConfig } from 'next';

// Where the Express API listens. In production Nginx routes /api to it before Next sees the request,
// so this rewrite only matters locally — it gives dev the same single-origin setup (no CORS, same cookies).
const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // @restaurant/shared ships TypeScript source
  transpilePackages: ['@restaurant/shared'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
