import { useEffect, useState } from 'react';
import {
  BarChart3,
  LogOut,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
} from 'lucide-react';
import {
  fetchAdminBootstrap,
} from '@/lib/api';
import { signOutAdmin } from '@/lib/auth';
import { useStore } from '@/lib/store';
import AdminLoginGate from './AdminLoginGate';
import { OverviewTab } from './OverviewTab';
import { ProductsAdminTab } from './ProductsAdminTab';
import { OrdersAdminTab } from './OrdersAdminTab';
import { ChatsAdminTab } from './ChatsAdminTab';
import { ShippingAndSettingsTab } from './ShippingAndSettingsTab';

export function AdminDashboard() {
  const isAuthed = useStore((s) => s.adminAuthenticated);
  const adminEmail = useStore((s) => s.adminEmail);
  const [tab, setTab] = useState<
    'overview' | 'products' | 'orders' | 'chats' | 'shipping'
  >(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('chat')) return 'chats';
    if (params.has('order')) return 'orders';
    return 'overview';
  });
  const pend = useStore(
    (s) =>
      s.orders.filter((o) => o.status === 'pending_phone_confirmation').length
  );
  const live = useStore(
    (s) => s.sessions.filter((x) => x.needs_human_agent).length
  );

  useEffect(() => {
    if (!isAuthed) return;
    void fetchAdminBootstrap();
    const timer = setInterval(() => {
      void fetchAdminBootstrap();
    }, 6000);
    return () => clearInterval(timer);
  }, [isAuthed]);

  if (!isAuthed) {
    return <AdminLoginGate />;
  }

  const TABS = [
    ['overview', 'نظرة عامة', BarChart3, 0],
    ['products', 'الهواتف والصور', Smartphone, 0],
    ['orders', 'الطلبات', ShoppingBag, pend],
    ['chats', 'غرفة التفاوض', MessageSquare, live],
    ['shipping', 'الولايات والإعدادات', Truck, 0],
  ] as const;

  return (
    <div dir="rtl" className="mx-auto max-w-5xl p-4 pb-24 sm:px-6">
      {/* Top Admin Status Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
        <span className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck size={15} className="text-emerald-600" />
          متصل بمركز عمليات DZPhone ({adminEmail})
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="تحديث البيانات"
            onClick={() => void fetchAdminBootstrap()}
            className="rounded-lg bg-white p-1.5 text-slate-600 shadow-2xs hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            onClick={() => void signOutAdmin()}
            className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 dark:bg-slate-800 dark:text-rose-400"
          >
            <LogOut size={12} />
            خروج
          </button>
        </div>
      </div>

      {/* Desktop / Tablet Top Navigation Tabs */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 dark:border-slate-800 dark:bg-[#111827]">
        {TABS.map(([k, l, I, badge]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${
              tab === k
                ? 'bg-[#0F172A] text-white dark:bg-[#2563EB]'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <I size={15} />
            <span>{l}</span>
            {badge > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] text-white">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div>
        {tab === 'overview' && <OverviewTab onSelectTab={setTab} />}
        {tab === 'products' && <ProductsAdminTab />}
        {tab === 'orders' && <OrdersAdminTab />}
        {tab === 'chats' && <ChatsAdminTab />}
        {tab === 'shipping' && <ShippingAndSettingsTab />}
      </div>
    </div>
  );
}
