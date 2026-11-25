'use client';

import { useEffect, useState } from 'react';

type Health = { status: string; mongo: string; redis: string } | { error: string };

/** Calls /api/health through the same-origin route (Next rewrite in dev, Nginx in prod). */
export function ApiHealth() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch((err: unknown) =>
        setHealth({ error: err instanceof Error ? err.message : 'unreachable' }),
      );
  }, []);

  if (!health) return <p className="text-sm text-stone-500">Checking API…</p>;
  if ('error' in health)
    return <p className="text-sm text-red-700">API unreachable: {health.error}</p>;
  const ok = health.status === 'ok';
  return (
    <p className={`text-sm ${ok ? 'text-green-700' : 'text-red-700'}`}>
      API {health.status} · MongoDB {health.mongo} · Redis {health.redis}
    </p>
  );
}
