import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { Lang, money, t } from '@/lib/i18n';
import { removeFromCart, updateCartQty, useStore } from '@/lib/store';
import { AlgeriaCODCheckoutForm } from './CODForm';
import { getPreferredProductImageUrl } from '@/lib/product-image';

export function CartDrawer({
  lang,
  onClose,
}: {
  lang: Lang;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'bag' | 'checkout'>('bag');
  const cart = useStore((s) => s.cart);
  const products = useStore((s) => s.products);

  const lines = useMemo(
    () =>
      cart
        .map((c) => {
          const product = products.find((p) => p.id === c.product_id);
          return product ? { product, quantity: c.quantity } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [cart, products]
  );

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (acc, line) => acc + line.product.price_dzd * line.quantity,
        0
      ),
    [lines]
  );

  const side = lang === 'ar' ? '-100%' : '100%';

  return (
    <motion.div
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs"
        onClick={onClose}
      />
      <motion.aside
        aria-label={t(lang, 'cartTitle')}
        initial={{ x: side }}
        animate={{ x: 0 }}
        exit={{ x: side }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className={`absolute inset-y-0 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-[#0B1120] ${
          lang === 'ar' ? 'left-0' : 'right-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-[#2563EB] dark:bg-blue-950/60">
              <ShoppingBag size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t(lang, 'cartTitle')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lines.reduce((a, l) => a + l.quantity, 0)}{' '}
                {lang === 'ar'
                  ? 'منتجات'
                  : lang === 'fr'
                    ? 'articles'
                    : 'items'}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="إغلاق السلة"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {lines.length === 0 && step === 'bag' ? (
            <div className="grid place-items-center gap-3 py-16 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
                <ShoppingBag size={26} />
              </span>
              <p className="max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {t(lang, 'cartEmpty')}
              </p>
            </div>
          ) : step === 'checkout' ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep('bag')}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
              >
                {lang === 'ar' ? (
                  <ArrowRight size={14} />
                ) : (
                  <ArrowLeft size={14} />
                )}
                {t(lang, 'backToCart')}
              </button>
              <AlgeriaCODCheckoutForm
                cartItems={lines}
                lang={lang}
                purchaseMethod="direct_checkout"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {lines.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  {getPreferredProductImageUrl(product.images?.[0]) && (
                    <img
                      src={getPreferredProductImageUrl(product.images?.[0])}
                      alt={product.name[lang]}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                      {product.name[lang]}
                    </p>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-[#2563EB] dark:text-blue-400">
                      {money(product.price_dzd, lang)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => updateCartQty(product.id, quantity - 1)}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center font-mono text-xs font-bold tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateCartQty(product.id, quantity + 1)}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() => removeFromCart(product.id)}
                        className="ms-auto rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {lines.length > 0 && step === 'bag' && (
          <div className="border-t border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-[#0B1120]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t(lang, 'pPrice')}
              </span>
              <span className="font-mono text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                {money(subtotal, lang)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStep('checkout')}
              className="w-full rounded-2xl bg-[#2563EB] py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              {t(lang, 'proceedCheckout')}
            </button>
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}
