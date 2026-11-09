import { useState } from 'react';
import {
  Camera,
  Check,
  Handshake,
  MessageCircle,
  MessagesSquare,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import type { Product } from '@/data/products';
import { Lang, money, t } from '@/lib/i18n';
import { addToCart, useStore } from '@/lib/store';

export function PurchasePathways({
  p,
  lang,
  onCheckout,
  onChat,
}: {
  p: Product;
  lang: Lang;
  onCheckout: () => void;
  onChat: () => void;
}) {
  const st = useStore((s) => s.settings);
  const [added, setAdded] = useState(false);
  const isSoldOut = ['sold', 'reserved', 'hidden', 'draft'].includes(p.availability || '') || (p.stock_quantity ?? 0) <= 0;

  const msg = encodeURIComponent(
    lang === 'ar'
      ? `مرحباً، أريد طلب هاتف ${p.name.ar} بسعر ${money(p.price_dzd, lang)}`
      : lang === 'fr'
        ? `Bonjour, je souhaite commander le ${p.name.fr} à ${money(p.price_dzd, lang)}`
        : `Hi, I'd like to order the ${p.name.en} at ${money(p.price_dzd, lang)}`
  );

  const hasWhatsapp = Boolean(st.whatsapp && st.whatsapp.trim());

  const S = [
    ...(hasWhatsapp
      ? [
          {
            n: 'WhatsApp',
            I: MessageCircle,
            u: `https://wa.me/${st.whatsapp.trim()}?text=${msg}`,
            c: 'text-emerald-600 dark:text-emerald-400',
          },
        ]
      : []),
    {
      n: 'Instagram',
      I: Camera,
      u: `https://ig.me/m/${st.instagram}`,
      c: 'text-pink-600 dark:text-pink-400',
    },
    {
      n: 'Messenger',
      I: MessagesSquare,
      u: `https://m.me/${st.messenger}`,
      c: 'text-blue-600 dark:text-blue-400',
    },
  ];

  const handleAddBag = () => {
    if (isSoldOut) return;
    addToCart(p.id, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={isSoldOut}
          onClick={onCheckout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.65)] transition hover:bg-blue-700 disabled:opacity-50"
        >
          <Zap size={16} />
          {isSoldOut ? t(lang, 'soldOut') : t(lang, 'buy')}
        </button>

        <button
          type="button"
          disabled={isSoldOut}
          onClick={handleAddBag}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition ${
            added
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
          }`}
        >
          {added ? <Check size={16} /> : <ShoppingBag size={16} />}
          {added ? t(lang, 'addedToCart') : t(lang, 'addToCart')}
        </button>
      </div>

      <button
        type="button"
        onClick={onChat}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 transition hover:border-[#2563EB] hover:text-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <Handshake size={16} />
        {t(lang, 'nego')}
      </button>

      <p className="pt-1 text-center text-[11px] text-slate-500 dark:text-slate-400">
        {t(lang, 'social')}
      </p>
      <div
        className={`grid gap-2 ${
          S.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        }`}
      >
        {S.map((s) => (
          <a
            key={s.n}
            href={s.u}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 rounded-xl border border-slate-200/80 bg-white py-2.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <s.I size={18} className={s.c} />
            {s.n}
          </a>
        ))}
      </div>
    </div>
  );
}
