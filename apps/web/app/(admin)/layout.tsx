import type { ReactNode } from 'react';

export const metadata = { title: 'Admin', robots: { index: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-6xl p-4">{children}</div>;
}
