import { useEffect, useState } from 'react';
import { AlertTriangle, BellRing } from 'lucide-react';
import { adminPatchWilaya, adminSaveSettings } from '@/lib/api';
import { useStore } from '@/lib/store';
import { numInput } from './admin-shared';

export function ShippingAndSettingsTab() {
  const ws = useStore((s) => s.wilayas);
  const st = useStore((s) => s.settings);
  const outbox = useStore((s) => s.outbox);
  const telegramConfigured = useStore((s) => s.telegramConfigured);
  const [q, setQ] = useState('');
  const [wFilter, setWFilter] = useState<'all' | 'active' | 'new11'>('all');
  const [f, setF] = useState(st);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setF(st);
  }, [st]);

  const rows = ws.filter((w) => {
    if (wFilter === 'active' && !w.is_active) return false;
    if (wFilter === 'new11' && Number(w.code) < 59) return false;
    if (!q) return true;
    return (
      w.name_ar.includes(q) ||
      w.name_fr.toLowerCase().includes(q.toLowerCase()) ||
      w.name_en.toLowerCase().includes(q.toLowerCase()) ||
      w.code.includes(q)
    );
  });

  const activeWilayas = ws.filter((w) => w.is_active);
  const activeCount = activeWilayas.length;
  const allActiveUseDefaultSeedRates =
    activeWilayas.length > 0 &&
    activeWilayas.every(
      (w) => w.home_delivery_price === 800 && w.stop_desk_price === 500
    );

  return (
    <div className="space-y-5">
      {/* Warning Banner when active wilayas still use default seed prices (800 / 500) */}
      {allActiveUseDefaultSeedRates && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <b className="block text-sm font-bold">
              تنبيه هام قبل الإطلاق: أسعار التوصيل لا تزال على القيم الافتراضية التجريبية (800 دج للمنزل / 500 دج للمكتب)
            </b>
            <p className="leading-relaxed">
              جميع الولايات المفعّلة حالياً تستخدم التسعيرة المبدئية (800 / 500 دج). يرجى مراجعة جدول شركة التوصيل المعتمدة لديك (مثل Yalidine أو ZR Express) وتحديث أسعار التوصيل الحقيقية لكل ولاية أدناه.
            </p>
          </div>
        </div>
      )}

      {/* Store Contact Settings */}
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          قنوات التواصل الرسمية للمتجر
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ['whatsapp', 'رقم WhatsApp (دولي بدون +)'],
              ['instagram', 'حساب Instagram'],
              ['messenger', 'صفحة Messenger'],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="block text-xs text-slate-500">
              {l}
              <input
                dir="ltr"
                value={f[k]}
                onChange={(e) => setF({ ...f, [k]: e.target.value })}
                className={numInput + ' mt-1 w-full'}
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={async () => {
            await adminSaveSettings(f);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className="rounded-xl bg-[#0F172A] px-5 py-2.5 text-xs font-bold text-white dark:bg-[#2563EB]"
        >
          {saved ? '✓ تم حفظ الإعدادات' : 'حفظ إعدادات التواصل'}
        </button>
      </div>

      {/* 69 Algerian Wilayas Shipping Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              إدارة التوصيل لـ {ws.length} ولاية جزائرية (01–69) — المفعّلة:{' '}
              {activeCount}
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              الولايات الـ 11 المستحدثة (59–69) مضافة بالأسماء الرسمية ومعطلة افتراضياً حتى تحدد أسعار شركة الشحن وتفعّلها.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', `الكل (${ws.length})`],
                ['active', `المفعّلة (${activeCount})`],
                ['new11', 'الـ 11 الجديدة (59–69)'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setWFilter(k)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  wFilter === k
                    ? 'bg-[#0F172A] text-white dark:bg-[#2563EB]'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
            <input
              aria-label="بحث في الولايات"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث برقم أو اسم الولاية…"
              className={numInput + ' w-44'}
            />
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto pe-1">
          <div className="grid grid-cols-[2.4rem_1fr_5rem_5rem_2.5rem] gap-x-2 gap-y-2 text-xs">
            <b className="text-slate-400">#</b>
            <b className="text-slate-400">الولاية (AR / FR)</b>
            <b className="text-slate-400">مكتب (دج)</b>
            <b className="text-slate-400">منزل (دج)</b>
            <b className="text-slate-400">فعّال</b>
            {rows.map((w) => (
              <WilayaRow key={w.code} w={w} />
            ))}
          </div>
        </div>
      </div>

      {/* Telegram Outbox Monitor */}
      <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
            <BellRing size={15} className="text-[#2563EB]" />
            طابور إشعارات Telegram (Transactional Outbox)
          </h3>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
              telegramConfigured
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {telegramConfigured
              ? 'Telegram Bot متصل'
              : 'وضع الحفظ المحلي في Outbox'}
          </span>
        </div>
        {!outbox.length ? (
          <p className="text-xs text-slate-400">لا توجد إشعارات مسجلة بعد.</p>
        ) : (
          <div className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
            {outbox.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900"
              >
                <div>
                  <b className="font-mono text-slate-800 dark:text-slate-200">
                    {ev.event_type}
                  </b>
                  {ev.last_error && (
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">
                      {ev.last_error}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    ev.status === 'sent'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {ev.status} (محاولات: {ev.attempts})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WilayaRow({ w }: { w: any }) {
  const [a, setA] = useState(String(w.stop_desk_price));
  const [b, setB] = useState(String(w.home_delivery_price));
  useEffect(() => {
    setA(String(w.stop_desk_price));
    setB(String(w.home_delivery_price));
  }, [w.stop_desk_price, w.home_delivery_price]);
  return (
    <>
      <span className="self-center font-mono tabular-nums text-slate-400">
        {w.code}
      </span>
      <span
        className={`self-center font-medium ${
          w.is_active
            ? 'text-slate-800 dark:text-slate-200'
            : 'text-slate-400 line-through'
        }`}
      >
        {w.name_ar}{' '}
        <span className="text-[11px] font-normal text-slate-400">
          ({w.name_fr})
        </span>
        {w.parent_wilaya_code && (
          <span className="ms-1.5 rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#2563EB] no-underline dark:bg-blue-950/50 dark:text-blue-300">
            مستحدثة من {w.parent_wilaya_code}
          </span>
        )}
      </span>
      <input
        aria-label={`مكتب ${w.name_ar}`}
        dir="ltr"
        inputMode="numeric"
        className={numInput + ' w-full'}
        value={a}
        onChange={(e) => setA(e.target.value.replace(/\D/g, ''))}
        onBlur={() =>
          void adminPatchWilaya(w.code, { stop_desk_price: Number(a) || 0 })
        }
      />
      <input
        aria-label={`منزل ${w.name_ar}`}
        dir="ltr"
        inputMode="numeric"
        className={numInput + ' w-full'}
        value={b}
        onChange={(e) => setB(e.target.value.replace(/\D/g, ''))}
        onBlur={() =>
          void adminPatchWilaya(w.code, { home_delivery_price: Number(b) || 0 })
        }
      />
      <input
        aria-label={`تفعيل ${w.name_ar}`}
        type="checkbox"
        className="h-4 w-4 self-center accent-[#10B981]"
        checked={w.is_active}
        onChange={(e) =>
          void adminPatchWilaya(w.code, { is_active: e.target.checked })
        }
      />
    </>
  );
}
