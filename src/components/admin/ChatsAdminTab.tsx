import { useState } from 'react';
import { adminReply, adminUnlockCheckout } from '@/lib/api';
import { useStore } from '@/lib/store';
import { dz } from './admin-shared';

export function ChatsAdminTab() {
  const all = useStore((s) => s.sessions);
  const products = useStore((s) => s.adminProducts);
  const requestedSessionId = new URLSearchParams(window.location.search).get('chat') || '';
  const [showAll, setShowAll] = useState(Boolean(requestedSessionId));
  const list = showAll ? all : all.filter((s) => s.needs_human_agent);
  const [sel, setSel] = useState(requestedSessionId);
  const [txt, setTxt] = useState('');
  const [disc, setDisc] = useState('0');
  const ses = list.find((s) => s.id === sel) ?? list[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#111827]">
        <span className="text-xs font-bold text-slate-800 dark:text-white">
          محادثات غرفة الصفقة الذكية ({list.length})
        </span>
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
        >
          {showAll
            ? 'عرض طلبات التفاوض مع البائع فقط'
            : `عرض كل المحادثات (${all.length})`}
        </button>
      </div>

      {!ses ? (
        <p className="py-14 text-center text-sm text-slate-400">
          لا توجد محادثات تطلب تدخل البائع حالياً.
        </p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {list.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSel(s.id)}
                className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                  s.id === ses.id
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-blue-500 dark:bg-[#2563EB]'
                    : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {s.needs_human_agent ? '🙋‍♂️ ' : '💬 '}
                {products.find((x) => x.id === s.product_id)?.commercial_name ||
                  s.product_id}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#111827]">
            <div className="border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800">
              {products.find((x) => x.id === ses.product_id)?.name.ar} · الجلسة{' '}
              <span className="font-mono">{ses.id}</span>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto bg-[#F8FAFC] p-3 dark:bg-[#090D16]">
              {ses.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                    m.sender === 'human_agent'
                      ? 'me-auto bg-[#2563EB] text-white'
                      : m.sender === 'customer'
                        ? 'ms-auto bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <b className="mb-0.5 block text-[10px] opacity-70">
                    {m.sender === 'customer'
                      ? 'الزبون'
                      : m.sender === 'human_agent'
                        ? 'أنت (البائع)'
                        : 'المساعد الآلي'}
                  </b>
                  {m.content}
                </div>
              ))}
            </div>
            <div className="flex gap-2 p-3">
              <input
                aria-label="اكتب ردك كبائع"
                value={txt}
                onChange={(e) => setTxt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && txt.trim()) {
                    void adminReply(ses.id, txt.trim());
                    setTxt('');
                  }
                }}
                placeholder="اكتب ردك المباشر للزبون…"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs outline-none focus:border-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (txt.trim()) {
                    void adminReply(ses.id, txt.trim());
                    setTxt('');
                  }
                }}
                className="rounded-xl bg-[#0F172A] px-4 text-xs font-bold text-white dark:bg-[#2563EB]"
              >
                إرسال
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                منح خصم تفاوض خاص (دج):
              </label>
              <input
                aria-label="خصم اختياري بالدينار"
                dir="ltr"
                inputMode="numeric"
                value={disc}
                onChange={(e) => setDisc(e.target.value.replace(/\D/g, ''))}
                className={numInput + ' w-28'}
              />
            </div>
            <button
              type="button"
              onClick={() =>
                void adminUnlockCheckout(ses.id, Number(disc) || 0)
              }
              className="rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700"
            >
              {ses.checkout_unlocked
                ? `✓ تم فتح الاستمارة للزبون (خصم ${dz(ses.checkout_discount_dzd)})`
                : '🔓 فتح استمارة الدفع عند الاستلام للزبون'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
