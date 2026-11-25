import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { publicEnv } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: publicEnv.NEXT_PUBLIC_SITE_NAME,
    template: `%s · ${publicEnv.NEXT_PUBLIC_SITE_NAME}`,
  },
  description: `Order directly from ${publicEnv.NEXT_PUBLIC_SITE_NAME}.`,
};

export const viewport: Viewport = {
  themeColor: '#c2410c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
