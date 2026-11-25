import type { ReactNode } from 'react';

export const metadata = { title: 'Kitchen', robots: { index: false } };

/** Full-width tablet layout for the counter. */
export default function KitchenLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-stone-900 p-4 text-stone-50">{children}</div>;
}
