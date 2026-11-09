import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Info,
  Quote,
  ShieldCheck,
  X,
  ZoomIn,
} from 'lucide-react';
import type { Product } from '@/data/products';
import { Lang, money, t } from '@/lib/i18n';
import { AlgeriaCODCheckoutForm } from './CODForm';
import { XRayInspectionBadge } from './ProductCard';
import { PurchasePathways } from './PurchasePathways';
import { getPreferredProductImageUrl } from '@/lib/product-image';

export function ProductDialog({
  p,
  lang,
  view,
  setView,
  onClose,
  onChat,
}: {
  p: Product;
  lang: Lang;
  view: 'detail' | 'checkout';
  setView: (v: 'detail' | 'checkout') => void;
  onClose: () => void;
  onChat: () => void;
}) {
  const [selectedAngle, setSelectedAngle] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const s = p.specs;
  const sealed = p.condition === 'new_sealed';
  const stockQty = p.stock_quantity ?? 0;
  const isSoldOut = ['sold', 'reserved', 'hidden', 'draft'].includes(p.availability || '') || stockQty <= 0;

  const baseImages =
    p.images && p.images.length > 0
      ? p.images
      : [{ url: '', sort_order: 0 }];

  // One uploaded image is one view; never label crops of the same image as separate angles.
  const galleryViews = baseImages.map((img, idx) => ({
    url: getPreferredProductImageUrl(img),
    source_type: img.source_type ?? 'illustrative_studio_render',
    label:
      lang === 'ar'
        ? img.alt_ar || `صورة المنتج ${idx + 1}`
        : lang === 'fr'
          ? img.alt_fr || `Photo du produit ${idx + 1}`
          : img.alt_en || `Product image ${idx + 1}`,
    cropClass: 'scale-100 object-center',
  }));

  const activeView = galleryViews[selectedAngle] || galleryViews[0];
  const isRealUnitPhoto =
    activeView.source_type === 'merchant_uploaded_photo';
  const isVerifiedInspection =
    p.inspection?.data_status === 'merchant_verified';

  const rows: [string, string][] = [
    [
      t(lang, 'sDisplay'),
      `${s.display.size}" · ${s.display.tech} · ${s.display.res} · ${s.display.hz} Hz`,
    ],
    [t(lang, 'sCpu'), s.processor],
    [t(lang, 'sMem'), `${s.ram_gb} GB RAM / ${s.storage_gb} GB`],
    [
      t(lang, 'sCam'),
      `${s.camera.mp} MP${s.camera.aperture ? ' · ' + s.camera.aperture : ''}${
        s.camera.ois ? ' · OIS' : ''
      }`,
    ],
    [
      t(lang, 'sBat'),
      `${s.battery_mah.toLocaleString('fr-FR')} mAh${
        s.charging_w ? ` · ${s.charging_w}W` : ''
      }`,
    ],
  ];

  return (
    <motion.div
      className="fixed inset-0 z-40 grid place-items-end bg-slate-950/55 p-0 backdrop-blur-xs sm:place-items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={p.name[lang]}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200/80 bg-white p-5 shadow-2xl sm:max-w-4xl sm:rounded-3xl sm:p-6 dark:border-slate-800 dark:bg-[#0F172A]"
      >
        {/* Modal Header */}
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {p.brand} · {p.sku}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold text-white ${
                  sealed ? 'bg-[#0F172A] dark:bg-[#2563EB]' : 'bg-[#059669]'
                }`}
              >
                {t(lang, sealed ? 'sealed' : 'used')}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-medium ${
                  isSoldOut
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                }`}
              >
                {isSoldOut
                  ? t(lang, 'soldOut')
                  : `${t(lang, 'inStock')} (${stockQty})`}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-extrabold leading-snug text-slate-900 sm:text-xl dark:text-white">
              {p.name[lang]}
            </h2>
          </div>

          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            className="rounded-xl border border-slate-200/80 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {view === 'checkout' ? (
          <div className="mx-auto max-w-xl space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView('detail')}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
              >
                {lang === 'ar' ? (
                  <ArrowRight size={14} />
                ) : (
                  <ArrowLeft size={14} />
                )}
                {lang === 'ar'
                  ? 'العودة لتفاصيل الهاتف'
                  : lang === 'fr'
                    ? 'Retour à la fiche produit'
                    : 'Back to phone details'}
              </button>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                {money(p.price_dzd, lang)}
              </span>
            </div>
            <AlgeriaCODCheckoutForm
              p={p}
              lang={lang}
              purchaseMethod="direct_checkout"
            />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-12">
            {/* Left / Start Column: Multi-Angle Gallery */}
            <div className="space-y-3 md:col-span-6">
              <div
                onClick={() => setZoomed(!zoomed)}
                className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200/80 bg-[#F1F5F9] dark:border-slate-800 dark:bg-slate-900"
              >
                {activeView.url ? (
                    <img
                      src={activeView.url}
                      alt={`${p.name[lang]} — ${activeView.label}`}
                      className={`h-full w-full object-cover transition-transform duration-500 ${
                        zoomed ? 'scale-150' : activeView.cropClass
                      }`}
                    />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <div
                      className="h-40 w-20 rounded-2xl border-4 border-slate-900"
                      style={{ background: p.color }}
                    />
                  </div>
                )}

                {/* Provenance badge (top-start) */}
                <span
                  className={`absolute top-3 start-3 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium backdrop-blur-xs ${
                    isRealUnitPhoto
                      ? 'bg-emerald-900/85 text-emerald-100'
                      : 'bg-slate-900/80 text-slate-200'
                  }`}
                >
                  {isRealUnitPhoto ? <Camera size={12} /> : <Info size={12} />}
                  {t(lang, isRealUnitPhoto ? 'imgRealPhoto' : 'imgStudioRender')}
                </span>

                <span className="absolute bottom-3 end-3 flex items-center gap-1 rounded-lg bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
                  <ZoomIn size={12} />
                  {activeView.label}
                </span>
              </div>

              {/* Angle Selector Thumbnails */}
              <div className="grid grid-cols-3 gap-2">
                {galleryViews.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedAngle(idx);
                      setZoomed(false);
                    }}
                    className={`overflow-hidden rounded-xl border p-1.5 text-center transition ${
                      selectedAngle === idx
                        ? 'border-[#2563EB] bg-blue-50/50 ring-1 ring-[#2563EB] dark:bg-blue-950/40'
                        : 'border-slate-200/80 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    {g.url && (
                      <div className="mb-1 aspect-[16/10] overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800">
                        <img
                          src={getPreferredProductImageUrl(g) || g.url}
                          alt={g.label}
                          className={`h-full w-full object-cover ${g.cropClass}`}
                        />
                      </div>
                    )}
                    <span className="block truncate text-[10px] font-medium text-slate-700 dark:text-slate-300">
                      {g.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Seller's Personal Advice Box */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <Quote size={13} />
                  {t(lang, 'note')}
                </div>
                <p className="text-xs leading-relaxed text-amber-950 dark:text-amber-100/90">
                  {p.seller_personal_note[lang]}
                </p>
              </div>
            </div>

            {/* Right / End Column: Contiguous Purchase Module & Specs */}
            <div className="flex flex-col gap-4 md:col-span-6">
              <div className="flex items-baseline justify-between rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {t(lang, 'pPrice')}
                  </span>
                  <span className="font-mono text-2xl font-extrabold tabular-nums text-[#2563EB] dark:text-blue-400">
                    {money(p.price_dzd, lang)}
                  </span>
                </div>
                <div className="text-end text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center justify-end gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck size={14} />
                    {t(lang, 'trustCodTitle')}
                  </span>
                  <span>{t(lang, 'shippingActiveOnly')} · Stop Desk / Home</span>
                </div>
              </div>

              {p.inspection && (
                <>
                  <XRayInspectionBadge p={p} lang={lang} />
                  <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
                    {isVerifiedInspection ? (
                      <>
                        <b className="text-slate-900 dark:text-white">
                          {t(lang, 'bodyDesc')}: {' '}
                        </b>
                        {p.inspection.body_description[lang]}
                        <p className="mt-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                          {t(lang, 'demo')}
                        </p>
                      </>
                    ) : (
                      <p className="text-amber-700 dark:text-amber-400">
                        {t(lang, 'demoTemplate')}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t(lang, 'specs')}
                </h3>
                <dl className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 text-xs dark:divide-slate-800 dark:border-slate-800">
                  {rows.map(([k, v]) => (
                    <div
                      key={k}
                      className="grid grid-cols-[7.5rem_1fr] gap-3 bg-white px-3.5 py-2.5 dark:bg-slate-900/50"
                    >
                      <dt className="font-medium text-slate-500 dark:text-slate-400">
                        {k}
                      </dt>
                      <dd
                        className="font-mono font-medium text-slate-900 dark:text-slate-100"
                        dir="ltr"
                        style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}
                      >
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-auto pt-1">
                <PurchasePathways
                  p={p}
                  lang={lang}
                  onCheckout={() => setView('checkout')}
                  onChat={onChat}
                />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
