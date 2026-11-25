import { ALLOWED_TRANSITIONS, ORDER_STATUSES, ORDER_STATUS_LABEL } from '@restaurant/shared';

/** Renders the shared order lifecycle — proves @restaurant/shared resolves in the web app. */
export function OrderStatusList() {
  return (
    <ul className="grid gap-1 text-sm">
      {ORDER_STATUSES.map((status) => (
        <li key={status} className="flex flex-wrap gap-2">
          <code className="rounded bg-stone-100 px-1.5">{status}</code>
          <span>{ORDER_STATUS_LABEL[status]}</span>
          <span className="text-stone-400">
            →{' '}
            {ALLOWED_TRANSITIONS[status].length ? ALLOWED_TRANSITIONS[status].join(', ') : 'final'}
          </span>
        </li>
      ))}
    </ul>
  );
}
