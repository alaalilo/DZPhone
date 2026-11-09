import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  FileText,
  MapPin,
  PackageSearch,
  Phone,
  ShieldCheck,
  Smartphone,
  Truck,
  X,
} from 'lucide-react';
import { Lang, t } from '@/lib/i18n';
import { trackOrder } from '@/lib/api';
import { type OrderStatus, useStore } from '@/lib/store';

type PolicyKey = 'about' | 'shipping' | 'returns' | 'privacy' | null;

const TRACK_STATUS_LABELS: Record<
  OrderStatus,
  { ar: string; fr: string; en: string; badge: string }
> = {
  pending_phone_confirmation: {
    ar: 'بانتظار مكالمة التأكيد الهاتفي',
    fr: 'En attente de confirmation téléphonique',
    en: 'Awaiting phone confirmation',
    badge:
      'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  },
  confirmed_by_call: {
    ar: 'تم تأكيد الطلب هاتفياً — قيد التجهيز',
    fr: 'Confirmée par téléphone — en préparation',
    en: 'Confirmed by phone — preparing shipment',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  },
  shipped: {
    ar: 'تم تسليم الطرد لشركة التوصيل (قيد الشحن)',
    fr: 'Expédiée avec le transporteur',
    en: 'Shipped with courier',
    badge:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
  },
  delivered: {
    ar: 'تم التسليم بنجاح',
    fr: 'Livrée avec succès',
    en: 'Delivered successfully',
    badge:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  cancelled: {
    ar: 'ملغى',
    fr: 'Annulée',
    en: 'Cancelled',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  },
};

export function StoreFooter({ lang }: { lang: Lang }) {
  const settings = useStore((s) => s.settings);
  const wilayas = useStore((s) => s.wilayas);
  const [modal, setModal] = useState<PolicyKey>(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [orderNum, setOrderNum] = useState('');
  const [phoneNum, setPhoneNum] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackResult, setTrackResult] = useState<{
    status: OrderStatus;
    created_at: string;
  } | null>(null);

  const activeCount = wilayas.filter((w) => w.is_active).length;
  const totalCount = wilayas.length || 69;
  const hasWhatsapp = Boolean(settings.whatsapp && settings.whatsapp.trim());

  const handleTrackSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setTrackResult(null);
    setTrackLoading(true);
    try {
      const res = await trackOrder(orderNum.trim(), phoneNum.trim());
      setTrackResult(res);
    } catch {
      setTrackError(
        lang === 'ar'
          ? 'لم يتم العثور على طلب مطابق لبياناتك. يرجى التحقق من رقم الطلب ورقم الهاتف.'
          : lang === 'fr'
            ? 'Aucune commande trouvée. Veuillez vérifier le numéro de commande et le téléphone.'
            : 'No matching order found. Please verify your order number and phone number.'
      );
    } finally {
      setTrackLoading(false);
    }
  };

  const policies: Record<
    Exclude<PolicyKey, null>,
    { title: string; content: string[] }
  > = {
    about: {
      title:
        lang === 'ar'
          ? 'من نحن — متجر DZPhone الجزائر'
          : lang === 'fr'
            ? 'À propos de DZPhone Algérie'
            : 'About DZPhone Algeria',
      content:
        lang === 'ar'
          ? [
              'DZPhone هو متجر جزائري متخصص في بيع الهواتف الذكية الأصلية الجديدة المغلقة (Scellé) والمستعملة النظيفة المفحوصة بتقنية X-Ray.',
              'نلتزم بالشفافية الكاملة: نميز بوضوح بين الصور التوضيحية للطراز والصور الفوتوغرافية الحقيقية للوحدة المستعملة المعروضة للبيع.',
              `يدعم النظام التقسيم الإداري الرسمي الجديد للجزائر (69 ولاية: 01–69)، مع التوصيل حالياً إلى ${activeCount} ولاية مغطاة من شركة الشحن والدفع نقداً عند الاستلام.`,
            ]
          : lang === 'fr'
            ? [
                'DZPhone est une boutique algérienne spécialisée dans les smartphones authentiques Neufs Scellés et Occasion Comme Neuf inspectés par X-Ray.',
                'Transparence totale : distinction claire entre les rendus studio illustratifs et les photographies réelles de chaque appareil d’occasion.',
                `Le système prend en charge les 69 wilayas administratives. La livraison est proposée uniquement dans les wilayas activées et couvertes par le transporteur (${activeCount} actuellement), avec paiement à la livraison après confirmation téléphonique.`,
              ]
            : [
                'DZPhone is an Algerian retailer specializing in authentic New Sealed and X-Ray Inspected Used Like-New smartphones.',
                'Complete transparency: we clearly distinguish illustrative model renders from actual photographs of the physical pre-owned unit.',
                `The system supports the 69 administrative wilayas. Delivery is available only in active courier-covered wilayas (${activeCount} currently), with Cash on Delivery after phone confirmation.`,
              ],
    },
    shipping: {
      title:
        lang === 'ar'
          ? 'معلومات التوصيل والدفع عند الاستلام'
          : lang === 'fr'
            ? 'Infos Livraison & Paiement à la Livraison'
            : 'Delivery Info & Cash on Delivery',
      content:
        lang === 'ar'
          ? [
              '[يرجى مراجعة هذا النص] — نص نموذجي لسياسة التوصيل يجب على مالك المتجر مراجعته واعتماده قبل الإطلاق التجاري.',
              '1. التأكيد الهاتفي: فور تسجيل طلبك في الموقع، يتصل بك فريق DZPhone هاتفياً لتأكيد العنوان ونوع التوصيل (مكتب Stop Desk أو لباب المنزل).',
              '2. مدة التوصيل: تختلف حسب الولاية وشركة الشحن، ويؤكد فريق DZPhone المدة المتوقعة أثناء الاتصال الهاتفي قبل الشحن.',
              '3. التغطية: نقبل الطلبات في الولايات المفعّلة فقط في نموذج الطلب. لا يعني دعم النظام الإداري للولايات الـ69 أن شركة الشحن تغطيها جميعاً.',
            ]
          : lang === 'fr'
            ? [
                '[À vérifier par le propriétaire] — Texte modèle de politique de livraison à valider par le propriétaire de la boutique.',
                '1. Confirmation téléphonique : Notre équipe vous appelle pour valider votre commande et le mode de livraison (Stop Desk ou Domicile).',
                '2. Délai de livraison : il dépend de la wilaya et du transporteur. Le délai estimé est confirmé par téléphone avant expédition.',
                '3. Couverture : les commandes sont acceptées uniquement pour les wilayas activées dans le formulaire. La prise en charge administrative des 69 wilayas ne signifie pas que le transporteur les dessert toutes.',
              ]
            : [
                '[Owner review required] — Template delivery policy to be reviewed and finalized by the store owner.',
                '1. Phone Confirmation: Our team calls you directly to verify your order and delivery mode (Stop Desk or Home Delivery).',
                '2. Delivery time: it depends on the wilaya and courier. The estimated timeline is confirmed by phone before dispatch.',
                '3. Coverage: orders are accepted only for wilayas enabled in the checkout form. Supporting the 69-wilaya administrative model does not mean the courier serves every wilaya.',
              ],
    },
    returns: {
      title:
        lang === 'ar'
          ? 'سياسة الضمان والاستبدال والاسترجاع'
          : lang === 'fr'
            ? 'Politique de Garantie, Retour & Échange'
            : 'Return & Warranty Policy',
      content:
        lang === 'ar'
          ? [
              '[يرجى مراجعة هذا النص] — نص نموذجي لسياسة الضمان والاسترجاع يجب على مالك المتجر تحديد مدته وشروطه بدقة.',
              'يحق للزبون إلغاء الطلب مجاناً قبل شحنه أو أثناء مكالمة التأكيد الهاتفي.',
              'بالنسبة للهواتف المستعملة: يلتزم المتجر بتأكيد صور الجهاز الفعلي وتقرير الفحص الموثق (X-Ray) للوحدة المحددة قبل إرسالها للزبون.',
              'في حال وجود أي اختلاف عن تقرير الفحص الموثق عند الاستلام، يتكفل المتجر بالاستبدال أو الاسترجاع وفق شروط الضمان المعلنة.',
            ]
          : lang === 'fr'
            ? [
                '[À vérifier par le propriétaire] — Texte modèle des conditions de garantie et de retour à personnaliser par le marchand.',
                'Vous pouvez annuler votre commande gratuitement avant expédition ou lors de l’appel de confirmation.',
                'Pour les téléphones d’occasion : les photos réelles de l’unité physique et son rapport X-Ray sont confirmés avant expédition.',
                'En cas de non-conformité à la réception, le retour ou l’échange est pris en charge selon les conditions de garantie.',
              ]
            : [
                '[Owner review required] — Template warranty and return policy to be customized by the store owner.',
                'Orders can be cancelled free of charge prior to shipment or during the confirmation call.',
                'For pre-owned phones: actual photos of the specific physical device and its verified X-Ray report are confirmed before dispatch.',
                'Full replacement or return is covered if the item differs from its verified inspection report.',
              ],
    },
    privacy: {
      title:
        lang === 'ar'
          ? 'سياسة الخصوصية وحماية البيانات'
          : lang === 'fr'
            ? 'Politique de Confidentialité'
            : 'Privacy Policy',
      content:
        lang === 'ar'
          ? [
              '[يرجى مراجعة هذا النص] — نص نموذجي لسياسة الخصوصية يجب على مالك المتجر مراجعته.',
              'ما هي البيانات التي نجمعها ولماذا؟ نجمع فقط: الاسم الكامل، رقم الهاتف النقال الجزائري (05/06/07)، الولاية، البلدية، وعنوان التوصيل، وذلك حصرياً للاتصال بك وتأكيد طلبك وشحنه عبر شركة التوصيل.',
              'لا نقوم ببيع أو مشاركة أرقام هواتف الزبائن مع أي طرف إعلاني خارجي، ولا يتم تخزين بيانات الزبائن في ذاكرة التخزين المؤقت للمتصفح العام.',
              'تُحفظ محادثات غرفة الصفقة الذكية لتمكين البائع من متابعة طلبات التفاوض وتقديم الدعم.',
            ]
          : lang === 'fr'
            ? [
                '[À vérifier par le propriétaire] — Texte modèle de politique de confidentialité à valider par le propriétaire.',
                'Quelles données collectons-nous et pourquoi ? Vos coordonnées (nom complet, numéro mobile algérien, wilaya, commune et adresse) sont collectées exclusivement pour confirmer votre commande par téléphone et assurer la livraison.',
                'Aucune donnée personnelle n’est vendue ou partagée à des tiers publicitaires.',
              ]
            : [
                '[Owner review required] — Template privacy policy to be reviewed by the store owner.',
                'What data is collected and why: Customer details (full name, Algerian mobile phone number, wilaya, commune, and delivery address) are collected strictly for phone confirmation and courier delivery.',
                'We never sell or share customer phone numbers with third-party advertisers.',
              ],
    },
  };

  return (
    <footer className="mt-16 border-t border-slate-200/80 bg-white text-slate-600 dark:border-slate-800 dark:bg-[#0B1120] dark:text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0F172A] text-white dark:bg-[#2563EB]">
                <Smartphone size={16} />
              </span>
              <span>{t(lang, 'brand')}</span>
            </div>
            <p className="text-xs leading-relaxed">
              {t(lang, 'heroSub')}
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck size={15} />
              <span>{t(lang, 'heroBadge')}</span>
            </div>
          </div>

          {/* Col 2: Policies & Trust */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {lang === 'ar'
                ? 'معلومات المتجر والضمان'
                : lang === 'fr'
                  ? 'Informations & Garanties'
                  : 'Store Policies & Trust'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => setModal('about')}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400"
                >
                  {policies.about.title}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setModal('shipping')}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400"
                >
                  {policies.shipping.title}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setModal('returns')}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400"
                >
                  {policies.returns.title}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setModal('privacy')}
                  className="hover:text-[#2563EB] dark:hover:text-blue-400"
                >
                  {policies.privacy.title}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Direct Contact & Order Tracking */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {lang === 'ar'
                ? 'التواصل المباشر وتتبع الطلب'
                : lang === 'fr'
                  ? 'Service Client & Suivi'
                  : 'Support & Order Tracking'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setTrackError(null);
                    setTrackResult(null);
                    setTrackOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1.5 font-semibold text-[#2563EB] transition hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
                >
                  <PackageSearch size={14} />
                  <span>
                    {lang === 'ar'
                      ? 'تتبع طلبي (Track Order)'
                      : lang === 'fr'
                        ? 'Suivre ma commande'
                        : 'Track my order'}
                  </span>
                </button>
              </li>
              {hasWhatsapp && (
                <li className="flex items-center gap-2">
                  <Phone size={14} className="text-[#2563EB]" />
                  <a
                    href={`https://wa.me/${settings.whatsapp.trim()}`}
                    target="_blank"
                    rel="noreferrer"
                    dir="ltr"
                    className="font-mono hover:underline"
                  >
                    +{settings.whatsapp.trim()} (WhatsApp)
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-[#10B981]" />
                <span>
                  {lang === 'ar'
                    ? `الجزائر العاصمة — ${activeCount} / ${totalCount} ولاية مفعّلة`
                    : lang === 'fr'
                      ? `Alger — ${activeCount} / ${totalCount} Wilayas actives`
                      : `Algiers — ${activeCount} / ${totalCount} Active Wilayas`}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Truck size={14} className="text-amber-500" />
                <span>Stop Desk &amp; Home Delivery (DZD)</span>
              </li>
            </ul>
          </div>

          {/* Col 4: 69-Wilaya Administrative Support & Verification */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {lang === 'ar'
                ? 'التقسيم الإداري الرسمي (69 ولاية)'
                : lang === 'fr'
                  ? 'Couverture Administrative (69 Wilayas)'
                  : '69-Wilaya Administrative Coverage'}
            </h4>
            <p className="text-xs leading-relaxed">
              {lang === 'ar'
                ? 'يدعم المتجر رسمياً الولايات الـ 69 الجزائرية (01–69)، وتُفعّل أسعار الشحن لكل ولاية فور تأكيد تغطية شركة التوصيل المعتمدة.'
                : lang === 'fr'
                  ? 'Prise en charge officielle des 69 wilayas algériennes (01–69). Les tarifs sont activés par wilaya selon la couverture confirmée du transporteur.'
                  : 'Official support for all 69 Algerian wilayas (01–69). Delivery rates are enabled per wilaya upon confirmed courier coverage.'}
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <CheckCircle2 size={13} className="text-[#10B981]" />
              <span>
                {activeCount}/{totalCount}{' '}
                {lang === 'ar'
                  ? 'ولاية مفعّلة للشحن المباشر'
                  : lang === 'fr'
                    ? 'wilayas couvertes'
                    : 'covered wilayas'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400 dark:border-slate-800/80">
          <span>
            © {new Date().getFullYear()} DZPhone Algeria. All rights reserved.
          </span>
          <span className="font-mono">DZD (دج) · 01–69 Wilayas · AR / FR / EN</span>
        </div>
      </div>

      {/* Policy Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal(null)}
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-xs"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0F172A]"
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <FileText size={17} className="text-[#2563EB]" />
                  {policies[modal].title}
                </h3>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {policies[modal].content.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Track Order Modal */}
      <AnimatePresence>
        {trackOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTrackOpen(false)}
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-xs"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0F172A]"
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <PackageSearch size={18} className="text-[#2563EB]" />
                  <span>
                    {lang === 'ar'
                      ? 'تتبع حالة طلبك'
                      : lang === 'fr'
                        ? 'Suivre l’état de votre commande'
                        : 'Track Your Order Status'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setTrackOpen(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleTrackSubmit} className="space-y-3.5 text-xs">
                <label className="block">
                  <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'ar'
                      ? 'رقم الطلب (مثال: ORD-2026-XXXXXX)'
                      : lang === 'fr'
                        ? 'Numéro de commande (ex: ORD-2026-XXXXXX)'
                        : 'Order Number (e.g., ORD-2026-XXXXXX)'}
                  </span>
                  <input
                    required
                    dir="ltr"
                    value={orderNum}
                    onChange={(e) => setOrderNum(e.target.value)}
                    placeholder="ORD-2026-..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs outline-none focus:border-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'ar'
                      ? 'رقم الهاتف المسجل في الطلب (05/06/07)'
                      : lang === 'fr'
                        ? 'Numéro de téléphone (05/06/07)'
                        : 'Phone Number Used in Order (05/06/07)'}
                  </span>
                  <input
                    required
                    dir="ltr"
                    inputMode="tel"
                    value={phoneNum}
                    onChange={(e) => setPhoneNum(e.target.value)}
                    placeholder="0555123456"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs outline-none focus:border-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <button
                  type="submit"
                  disabled={trackLoading}
                  className="w-full rounded-xl bg-[#2563EB] py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {trackLoading
                    ? lang === 'ar'
                      ? 'جارٍ البحث...'
                      : lang === 'fr'
                        ? 'Recherche...'
                        : 'Checking...'
                    : lang === 'ar'
                      ? 'عرض حالة الطلب'
                      : lang === 'fr'
                        ? 'Vérifier le statut'
                        : 'Check Status'}
                </button>
              </form>

              {trackError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  {trackError}
                </div>
              )}

              {trackResult && (
                <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      {lang === 'ar'
                        ? 'الحالة الحالية:'
                        : lang === 'fr'
                          ? 'Statut actuel :'
                          : 'Current Status:'}
                    </span>
                    <span
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                        TRACK_STATUS_LABELS[trackResult.status]?.badge || ''
                      }`}
                    >
                      {TRACK_STATUS_LABELS[trackResult.status]?.[lang] ||
                        trackResult.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">
                      {lang === 'ar'
                        ? 'تاريخ تسجيل الطلب:'
                        : lang === 'fr'
                          ? 'Date de création :'
                          : 'Order Date:'}
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">
                      {new Date(trackResult.created_at).toLocaleDateString(
                        lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-DZ' : 'en-GB'
                      )}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
}
