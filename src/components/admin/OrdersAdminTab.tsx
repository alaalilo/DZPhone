import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Search } from 'lucide-react';
import { ALLOWED, useStore } from '@/lib/store';
import { intl } from '@/lib/i18n';
import { ACT, ST, dz, numInput } from './admin-shared';

export function OrdersAdminTab() {
  const orders = useStore((s) => s.orders);
  const ws = useStore((s) => s.wilayas);
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get('order') || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (!q.trim()) return true;
        const lower = q.toLowerCase();
        return (
          o.customer_full_name.toLowerCase().includes(lower) ||
          o.customer_phone.includes(lower) ||
          (o.order_number || o.id).toLowerCase().includes(lower)
        );
      }),
    [orders, q, statusFilter]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-[#111827]">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث برقم الطلب، اسم الزبون، أو الهاتف..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 ps-8 pe-3 text-xs outline-none focus:border-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <select
          aria-label="تصفية حسب حالة الطلب"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={numInput}
        >
          <option value="all">كل الحالات ({orders.length})</option>
          <option value="pending_phone_confirmation">بانتظار الاتصال</option>
          <option value="confirmed_by_call">مؤكد هاتفياً</option>
          <option value="shipped">تم الشحن</option>
          <option value="delivered">تم التسليم</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {!filtered.length ? (
        <p className="py-12 text-center text-sm text-slate-400">
          لا توجد طلبات مطابقة للبحث.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const w = ws.find((x) => x.code === o.wilaya_code);
            return (
              <motion.div
                key={o.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <b className="font-mono text-sm text-slate-900 dark:text-white">
                      {o.order_number || o.id}
                    </b>
                    <span className="ms-2 text-[11px] text-slate-400">
                      {new Date(o.created_at).toLocaleString('fr-DZ')}
                    </span>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-0.5 text-[11px] font-semibold ${
                      ST[o.status][1]
                    }`}
                  >
                    {ST[o.status][0]}
                  </span>
                </div>

                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {o.customer_full_name}{' '}
                      <span className="font-mono text-[#2563EB]" dir="ltr">
                        · {o.customer_phone}
                      </span>
                    </p>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                      📍 ولاية {w?.code} {w?.name_ar} — بلدية {o.commune} (
                      {o.shipping_method === 'home_delivery'
                        ? 'توصيل للمنزل'
                        : 'مكتب Stop Desk'}
                      )
                      {o.delivery_address ? ` · ${o.delivery_address}` : ''}
                    </p>
                  </div>
                  <div className="sm:text-end">
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {o.items
                        .map((i) => `${i.name} (×${i.quantity})`)
                        .join(' + ')}
                    </p>
                    <p className="mt-0.5 font-mono text-slate-500">
                      المنتجات {dz(o.items_subtotal_dzd)}
                      {o.discount_dzd > 0 && ` − خصم ${dz(o.discount_dzd)}`} +
                      توصيل {dz(o.shipping_price_dzd)} ={' '}
                      <b className="text-slate-900 dark:text-white">
                        {dz(o.total_price_dzd)}
                      </b>
                    </p>
                  </div>
                </div>

                {o.customer_note && (
                  <p className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    📝 ملاحظة الزبون: {o.customer_note}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={`tel:${intl(o.customer_phone)}`}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#10B981] px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-600"
                  >
                    <Phone size={14} />
                    اتصال هاتفي بالزبون
                  </a>

                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {ACT.map(([s, l]) => (
                      <button
                        key={s}
                        type="button"
                        disabled={!ALLOWED[o.status].includes(s)}
                        onClick={() => void adminSetOrderStatus(o.id, s)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#2563EB] disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
