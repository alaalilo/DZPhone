import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BatteryCharging,
  Box,
  Cable,
  Camera,
  Check,
  Info,
  PenLine,
  PlugZap,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type { Product } from '@/data/products';
import { Lang, money, t } from '@/lib/i18n';
import { addToCart } from '@/lib/store';
import { getPreferredProductImageUrl } from '@/lib/product-image';

const ICON = {
  original_box: Box,
  cable: Cable,
  s_pen: PenLine,
  power_adapter: PlugZap,
} as const;

export function XRayInspectionBadge({
  p,
  lang,
  compact = false,
}: {
  p: Product;
  lang: Lang;
  compact?: boolean;
}) {
  const ins = p.inspection;
  if (!ins) return null;

  const isVerifiedUnit = ins.data_status === 'merchant_verified';

  const bar = (v: number, label: string, txt: string, Icon: any) => (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1.5">
          <Icon size={13} className="text-[#10B981]" />
          {label}
        </span>
        <b className="tabular-nums text-slate-900 dark:text-white">{txt}</b>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-emerald-400"
          initial={{ width: 0 }}
          whileInView={{ width: `${v}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-2.5 rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} />
          <span>X-Ray</span>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
              isVerifiedUnit
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300'
            }`}
          >
            {t(lang, isVerifiedUnit ? 'inspVerified' : 'inspTemplate')}
          </span>
        </span>
        {isVerifiedUnit ? (
          <span className="font-mono text-[11px] tabular-nums">
            🔋 {ins.battery_health_percent}%{!compact ? ` · ${ins.body_score_out_of_10}/10` : ''}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
            {t(lang, 'inspectionPending')}
          </span>
        )}
      </div>
      {!compact && isVerifiedUnit && bar(
        ins.battery_health_percent,
        t(lang, 'battery'),
        `${ins.battery_health_percent}%`,
        BatteryCharging
      )}
      {!compact && isVerifiedUnit &&
        bar(
          ins.body_score_out_of_10 * 10,
          t(lang, 'body'),
          `${ins.body_score_out_of_10}/10`,
          Sparkles
        )}
      {!compact && isVerifiedUnit && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {t(lang, 'acc')}:
          </span>
          {ins.accessories.map(([a, ok]) => {
            const I = ICON[a];
            return (
              <span
                key={a}
                className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] ring-1 ${
                  ok
                    ? 'bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700'
                    : 'bg-slate-50 text-slate-400 line-through ring-slate-200/60 dark:bg-slate-900/40 dark:text-slate-600 dark:ring-slate-800'
                }`}
              >
                <I size={11} />
                {t(lang, a)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProductCard({
  p,
  lang,
  onOpen,
  i,
}: {
  p: Product;
  lang: Lang;
  onOpen: () => void;
  i: number;
}) {
  const [justAdded, setJustAdded] = useState(false);
  const sealed = p.condition === 'new_sealed';
  const stockQty = p.stock_quantity ?? 0;
  const isSoldOut = ['sold', 'reserved', 'hidden', 'draft'].includes(p.availability || '') || stockQty <= 0;
  const primaryImage = p.images?.[0];
  const primaryImageUrl = getPreferredProductImageUrl(primaryImage);
  const isRealUnitPhoto =
    primaryImage?.source_type === 'merchant_uploaded_photo';
  const altText =
    lang === 'ar'
      ? primaryImage?.alt_ar || p.name.ar
      : lang === 'fr'
        ? primaryImage?.alt_fr || p.name.fr
        : primaryImage?.alt_en || p.name.en;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSoldOut) return;
    addToCart(p.id, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: i * 0.04, type: 'spring', stiffness: 260, damping: 26 }}
      whileHover={{ y: -3 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-[#111827]"
    >
      {/* Studio Photography Lead (4:3 Aspect Ratio) */}
      <button
        type="button"
        aria-label={p.name[lang]}
        onClick={onOpen}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#F1F5F9] text-start dark:bg-slate-900"
      >
        {primaryImageUrl ? (
          <img
            src={primaryImageUrl}
            alt={altText}
            loading={i < 3 ? 'eager' : 'lazy'}
            decoding="async"
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <div
              className="h-36 w-[4.5rem] rounded-[1.1rem] border-4 border-slate-900 shadow-lg"
              style={{
                background: `linear-gradient(160deg, ${p.color}, #fff 140%)`,
              }}
            />
          </div>
        )}

        {/* Top Condition Tag */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between">
          <span
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-xs backdrop-blur-md ${
              sealed ? 'bg-[#0F172A]/85 dark:bg-[#2563EB]/90' : 'bg-[#059669]/90'
            }`}
          >
            {t(lang, sealed ? 'sealed' : 'used')}
          </span>

          {isSoldOut ? (
            <span className="rounded-lg bg-rose-600/90 px-2.5 py-1 text-[11px] font-semibold text-white">
              {t(lang, p.availability === 'reserved' ? 'reserved' : 'soldOut')}
            </span>
          ) : (
            <span className="rounded-lg bg-white/90 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-800 backdrop-blur-sm dark:bg-slate-900/90 dark:text-slate-200">
              {stockQty} {t(lang, 'unitsLeft')}
            </span>
          )}
        </div>

        {/* Bottom Image Provenance Caption (Distinguishing AI Studio Render vs Real Device Photo) */}
        <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-start">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium backdrop-blur-md ${
              isRealUnitPhoto
                ? 'bg-emerald-900/85 text-emerald-100'
                : 'bg-slate-900/75 text-slate-200'
            }`}
          >
            {isRealUnitPhoto ? <Camera size={10} /> : <Info size={10} />}
            <span>
              {t(lang, isRealUnitPhoto ? 'imgRealPhoto' : 'imgStudioRender')}
            </span>
          </span>
        </div>
      </button>

      {/* Card Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-3.5 sm:gap-3 sm:p-5">
        <div>
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>{p.brand}</span>
            <span className="font-mono text-[11px]" dir="ltr">
              {p.specs.ram_gb}GB / {p.specs.storage_gb}GB
            </span>
          </div>
          <h3 className="mt-1 text-base font-bold leading-snug text-slate-900 dark:text-white">
            <button
              type="button"
              onClick={onOpen}
              className="text-start hover:text-[#2563EB] dark:hover:text-blue-400"
            >
              {p.name[lang]}
            </button>
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400" dir="ltr">
            {p.specs.display.size}&quot; {p.specs.display.hz}Hz · {p.specs.processor} ·{' '}
            {p.specs.camera.mp}MP
          </p>
        </div>

        {!sealed && <XRayInspectionBadge p={p} lang={lang} compact />}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
          <div>
            <span className="block text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
              {money(p.price_dzd, lang)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isSoldOut}
              aria-label={t(lang, 'addToCart')}
              onClick={handleQuickAdd}
              className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
                justAdded
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {justAdded ? <Check size={15} /> : <ShoppingBag size={15} />}
            </button>

            <button
              type="button"
              onClick={onOpen}
              className="min-h-11 rounded-xl bg-[#0F172A] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2563EB] dark:bg-[#2563EB] dark:hover:bg-blue-600"
            >
              {t(lang, 'view')} →
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
