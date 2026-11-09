import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { ST, dz } from './admin-shared';

export function OverviewTab({
  onSelectTab,
}: {
  onSelectTab: (t: 'orders' | 'products' | 'chats' | 'shipping') => void;
}) {
  const products = useStore((s) => s.adminProducts);
  const orders = useStore((s) => s.orders);
  const sessions = useStore((s) => s.sessions);
  const outbox = useStore((s) => s.outbox);

  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const availableProducts = products.filter(
      (p) => p.availability === 'available' && (p.stock_quantity ?? 0) > 0
    ).length;
    const soldOutOrHidden = totalProducts - availableProducts;

    const pendingOrders = orders.filter(
      (o) => o.status === 'pending_phone_confirmation'
    ).length;
    const confirmedOrders = orders.filter(
      (o) => o.status === 'confirmed_by_call'
    ).length;
    const shippedOrders = orders.filter((o) => o.status === 'shipped').length;
    const deliveredOrders = orders.filter(
      (o) => o.status === 'delivered'
    ).length;
    const cancelledOrders = orders.filter(
      (o) => o.status === 'cancelled'
    ).length;

    const activeSalesDzd = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((acc, o) => acc + o.total_price_dzd, 0);

    const waitingHumanChats = sessions.filter(
      (s) => s.needs_human_agent
    ).length;

    return {
      totalProducts,
      availableProducts,
      soldOutOrHidden,
      totalOrders: orders.length,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      activeSalesDzd,
      waitingHumanChats,
    };
  }, [products, orders, sessions]);

  const kpiCards = [
    {
      label: 'إجمالي المبيعات النشطة',
      value: dz(metrics.activeSalesDzd),
      sub: `${metrics.totalOrders} طلب مسجل`,
      accent: 'text-[#2563EB] dark:text-blue-400',
    },
    {
      label: 'بانتظار التأكيد الهاتفي',
      value: String(metrics.pendingOrders),
      sub: `مؤكد: ${metrics.confirmedOrders} · مشحون: ${metrics.shippedOrders}`,
      accent: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'الهواتف المتاحة في المتجر',
      value: `${metrics.availableProducts} / ${metrics.totalProducts}`,
      sub: `نفد أو مخفي: ${metrics.soldOutOrHidden}`,
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'طلبات التفاوض الحية',
      value: String(metrics.waitingHumanChats),
      sub: `${outbox.length} إشعار في طابور Outbox`,
      accent: 'text-indigo-600 dark:text-indigo-400',
    },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpiCards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#111827]"
          >
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {c.label}
            </span>
            <strong
              className={`mt-1 block font-mono text-lg font-extrabold tabular-nums ${c.accent}`}
            >
              {c.value}
            </strong>
            <span className="mt-1 block text-[11px] text-slate-400">
              {c.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Order Status Breakdown */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            توزيع حالات الطلبات (COD Pipeline)
          </h3>
          <button
            type="button"
            onClick={() => onSelectTab('orders')}
            className="text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
          >
            عرض كل الطلبات ←
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ['بانتظار الاتصال', metrics.pendingOrders, 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'],
            ['مؤكد هاتفياً', metrics.confirmedOrders, 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'],
            ['قيد الشحن', metrics.shippedOrders, 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'],
            ['تم التسليم', metrics.deliveredOrders, 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'],
            ['ملغي', metrics.cancelledOrders, 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'],
          ].map(([label, count, cls]) => (
            <div
              key={String(label)}
              className={`rounded-xl px-3 py-2.5 text-center ${cls}`}
            >
              <span className="block font-mono text-base font-bold tabular-nums">
                {count}
              </span>
              <span className="text-[11px] font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders Activity */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
        <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
          أحدث الطلبات المسجلة
        </h3>
        {!orders.length ? (
          <p className="py-6 text-center text-xs text-slate-400">
            لا توجد طلبات بعد.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {orders.slice(0, 5).map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
              >
                <div>
                  <b className="font-mono text-slate-900 dark:text-white">
                    {o.order_number || o.id}
                  </b>{' '}
                  · <span>{o.customer_full_name}</span>{' '}
                  <span className="font-mono text-slate-400" dir="ltr">
                    ({o.customer_phone})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {dz(o.total_price_dzd)}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                      ST[o.status][1]
                    }`}
                  >
                    {ST[o.status][0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
