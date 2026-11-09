import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, CheckCircle2, Home, Loader2, ShieldCheck } from 'lucide-react';
import type { Product } from '@/data/products';
import { Lang, fmtPhone, money, phoneOk, t, wName } from '@/lib/i18n';
import { createOrder } from '@/lib/api';
import { PurchaseMethod, ShippingMethod, clearCart, useStore } from '@/lib/store';

const field =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function AlgeriaCODCheckoutForm({
  p,
  cartItems,
  lang,
  purchaseMethod,
  chatSessionId = null,
  discount = 0,
  onOrderSuccess,
}: {
  p?: Product;
  cartItems?: { product: Product; quantity: number }[];
  lang: Lang;
  purchaseMethod: PurchaseMethod;
  chatSessionId?: string | null;
  discount?: number;
  onOrderSuccess?: () => void;
}) {
  const wilayas = useStore((s) => s.wilayas).filter((w) => w.is_active);
  const [f, setF] = useState({
    name: '',
    phone: '',
    wilaya: '',
    commune: '',
    address: '',
    note: '',
    type: 'stop_desk' as ShippingMethod,
  });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  const [orderNum, setOrderNum] = useState<string>('');

  const resolvedOrderLines = useMemo(() => {
    if (cartItems && cartItems.length > 0) {
      return cartItems;
    }
    if (p) {
      return [{ product: p, quantity: 1 }];
    }
    return [];
  }, [cartItems, p]);

  const subtotal = useMemo(
    () =>
      resolvedOrderLines.reduce(
        (acc, line) => acc + line.product.price_dzd * line.quantity,
        0
      ),
    [resolvedOrderLines]
  );

  const w = wilayas.find((x) => x.code === f.wilaya);
  const ship = w
    ? f.type === 'home_delivery'
      ? w.home_delivery_price
      : w.stop_desk_price
    : 0;
  const total = Math.max(0, subtotal - discount + ship);

  const err = useMemo(
    () => ({
      name: f.name.trim().length < 3,
      phone: !phoneOk(f.phone),
      wilaya: !f.wilaya,
      commune: f.commune.trim().length < 2,
      address: f.type === 'home_delivery' && f.address.trim().length < 5,
    }),
    [f]
  );

  const submit = async () => {
    setTouched(true);
    if (Object.values(err).some(Boolean) || resolvedOrderLines.length === 0)
      return;
    setBusy(true);
    setFail(null);
    try {
      const created = await createOrder(
        {
          customer_full_name: f.name.trim(),
          customer_phone: f.phone.replace(/\s/g, ''),
          wilaya_code: f.wilaya,
          commune: f.commune.trim(),
          delivery_address: f.address.trim(),
          shipping_method: f.type,
          purchase_method: purchaseMethod,
          chat_session_id: chatSessionId,
          items: resolvedOrderLines.map((line) => ({
            product_id: line.product.id,
            quantity: line.quantity,
          })),
          customer_note: f.note.trim() || undefined,
        },
        discount
      );
      setOrderNum(created.order_number || created.id);
      setDone(true);
      if (cartItems && cartItems.length > 0) {
        clearCart();
      }
      onOrderSuccess?.();
    } catch (e: any) {
      setFail(e?.message || 'تعذر إرسال الطلب، يرجى التحقق من البيانات.');
    }
    setBusy(false);
  };

  const E = (k: keyof typeof err, msg = t(lang, 'req')) =>
    touched &&
    err[k] && <p className="mt-1 text-[11px] text-rose-500">{msg}</p>;

  if (done)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="grid place-items-center gap-3 rounded-3xl border border-emerald-200/80 bg-emerald-50/40 p-6 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
        >
          <CheckCircle2 size={60} className="text-[#10B981]" />
        </motion.div>
        {orderNum && (
          <span className="rounded-xl bg-emerald-600 px-3.5 py-1 font-mono text-xs font-bold text-white">
            #{orderNum}
          </span>
        )}
        <h4 className="text-base font-bold text-slate-900 dark:text-white">
          {lang === 'ar'
            ? 'تم تسجيل طلبك بنجاح!'
            : lang === 'fr'
              ? 'Commande enregistrée avec succès !'
              : 'Order Confirmed Successfully!'}
        </h4>
        <p className="max-w-xs text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {lang === 'ar'
            ? `سنتصل بك هاتفياً على الرقم ${f.phone} خلال دقائق لتأكيد الطلبية والعنوان قبل شحنها إلى ولايتك. الدفع عند الاستلام.`
            : lang === 'fr'
              ? `Nous vous appellerons au ${f.phone} sous peu pour confirmer la commande avant l'expédition vers votre wilaya. Paiement à la livraison.`
              : `We will call you on ${f.phone} shortly to confirm your order before dispatching to your wilaya. Cash on delivery.`}
        </p>
      </motion.div>
    );

  return (
    <div className="space-y-3">
      <div>
        <input
          aria-label={t(lang, 'name')}
          className={field}
          placeholder={t(lang, 'name')}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        {E('name')}
      </div>
      <div>
        <input
          aria-label={t(lang, 'phone')}
          className={field + ' font-mono tracking-wider tabular-nums'}
          dir="ltr"
          inputMode="numeric"
          placeholder="05 55 12 34 56"
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: fmtPhone(e.target.value) })}
        />
        {E('phone', t(lang, 'phoneErr'))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <select
            aria-label={t(lang, 'wilaya')}
            className={field}
            value={f.wilaya}
            onChange={(e) => setF({ ...f, wilaya: e.target.value })}
          >
            <option value="">{t(lang, 'wilaya')}</option>
            {wilayas.map((x) => (
              <option key={x.code} value={x.code}>
                {x.code} · {wName(x, lang)}
              </option>
            ))}
          </select>
          {E('wilaya')}
        </div>
        <div>
          <input
            aria-label={t(lang, 'commune')}
            className={field}
            placeholder={t(lang, 'commune')}
            value={f.commune}
            onChange={(e) => setF({ ...f, commune: e.target.value })}
          />
          {E('commune')}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ['stop_desk', Building2, 'stop'],
            ['home_delivery', Home, 'home'],
          ] as const
        ).map(([k, I, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setF({ ...f, type: k })}
            className={`rounded-2xl border p-3 text-start transition ${
              f.type === k
                ? 'border-[#2563EB] bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40'
                : 'border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900'
            }`}
          >
            <I
              size={18}
              className={
                f.type === k
                  ? 'text-[#2563EB] dark:text-blue-400'
                  : 'text-slate-400'
              }
            />
            <p className="mt-1.5 text-xs font-semibold text-slate-900 dark:text-white">
              {t(lang, label)}
            </p>
            <p className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {w
                ? money(
                    k === 'home_delivery'
                      ? w.home_delivery_price
                      : w.stop_desk_price,
                    lang
                  )
                : '—'}
            </p>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {f.type === 'home_delivery' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <input
              aria-label={t(lang, 'address')}
              className={field}
              placeholder={t(lang, 'address')}
              value={f.address}
              onChange={(e) => setF({ ...f, address: e.target.value })}
            />
            {E('address')}
          </motion.div>
        )}
      </AnimatePresence>
      <input
        aria-label={t(lang, 'note2')}
        className={field}
        placeholder={t(lang, 'note2')}
        value={f.note}
        onChange={(e) => setF({ ...f, note: e.target.value })}
      />
      <div className="space-y-1.5 rounded-2xl bg-slate-50 p-3.5 text-sm ring-1 ring-slate-200/80 dark:bg-slate-900/90 dark:ring-slate-800">
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>{t(lang, 'pPrice')}</span>
          <span className="font-mono tabular-nums">
            {money(subtotal, lang)}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between font-medium text-[#10B981]">
            <span>{t(lang, 'disc')}</span>
            <span className="font-mono tabular-nums">
              − {money(discount, lang)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-slate-600 dark:text-slate-300">
          <span>{t(lang, 'dPrice')}</span>
          <span className="font-mono tabular-nums">
            {w ? money(ship, lang) : '—'}
          </span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900 dark:border-slate-800 dark:text-white">
          <span>{t(lang, 'total')}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={total}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-mono tabular-nums text-[#2563EB] dark:text-blue-400"
            >
              {money(total, lang)}
            </motion.span>
          </AnimatePresence>
        </div>
        <p className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck size={13} className="shrink-0 text-[#10B981]" />
          {t(lang, 'pay')}
        </p>
      </div>
      {fail && <p className="text-center text-xs text-rose-500">⚠︎ {fail}</p>}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={submit}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {t(lang, 'confirm')}
      </motion.button>
    </div>
  );
}
