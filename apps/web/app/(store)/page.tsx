import { ApiHealth } from '@/components/api-health';
import { OrderStatusList } from '@/components/order-status-list';
import { Placeholder } from '@/components/placeholder';

export default function MenuPage() {
  return (
    <div className="grid gap-4">
      <Placeholder title="Menu" session="Session 3 (server-rendered from GET /menu)">
        <ApiHealth />
      </Placeholder>
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">Order lifecycle (from @restaurant/shared)</h2>
        <OrderStatusList />
      </section>
    </div>
  );
}
