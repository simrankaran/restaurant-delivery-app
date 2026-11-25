import type { ReactNode } from 'react';

export const metadata = { title: 'Rider', robots: { index: false } };

/** Phone-first layout for riders. */
export default function RiderLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-md p-4">{children}</div>;
}
