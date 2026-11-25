import Link from 'next/link';
import type { ReactNode } from 'react';
import { publicEnv } from '@/lib/env';

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between py-4">
        <Link href="/" className="text-xl font-bold text-brand">
          {publicEnv.NEXT_PUBLIC_SITE_NAME}
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/cart">Cart</Link>
          <Link href="/account">Account</Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      {/* FSSAI licence number goes here and on every bill (Compliance flags); filled from outlet settings in Session 8. */}
      <footer className="py-6 text-xs text-stone-500">
        FSSAI Lic. No. — · Terms · Privacy · Refunds · Delivery · Contact
      </footer>
    </div>
  );
}
