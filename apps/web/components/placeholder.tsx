import type { ReactNode } from 'react';

/** Stand-in body for screens built in later sessions. */
export function Placeholder({
  title,
  session,
  children,
}: {
  title: string;
  session: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-stone-500">Placeholder — built in {session}.</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
