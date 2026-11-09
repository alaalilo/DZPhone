import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import type { Product } from '@/data/products';
import { Lang, money, t } from '@/lib/i18n';
import {
  createChatSession,
  getChatMessages,
  sendChatMessage,
} from '@/lib/api';
import { useStore } from '@/lib/store';
import { AlgeriaCODCheckoutForm } from './CODForm';
import { getPreferredProductImageUrl } from '@/lib/product-image';

export function SmartDealRoomDrawer({
  p,
  lang,
  onClose,
}: {
  p: Product;
  lang: Lang;
  onClose: () => void;
}) {
  const [sid, setSid] = useState('');
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const ses = useStore((s) => s.sessions.find((x) => x.id === sid));
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setSessionError(null);
    createChatSession(p.id, lang)
      .then((s) => { if (!cancelled) setSid(s.id); })
      .catch(() => { if (!cancelled) setSessionError(lang === 'ar' ? 'تعذر الاتصال بالمساعد حالياً. تحقق من اتصال الإنترنت وحاول مجدداً.' : lang === 'fr' ? 'Assistant indisponible. Vérifiez votre connexion et réessayez.' : 'The assistant is temporarily unavailable. Check your connection and try again.'); });
    return () => { cancelled = true; };
  }, [p.id, lang]);

  useEffect(() => {
    if (!sid) return;
    const timer = setInterval(() => {
      getChatMessages(sid);
    }, 4000);
    return () => clearInterval(timer);
  }, [sid]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ses?.messages.length, ses?.checkout_unlocked, typing]);

  const human = !!ses?.needs_human_agent;

  const send = async (customText?: string) => {
    const q = (customText ?? input).trim();
    if (!q || !sid) return;
    if (!customText) setInput('');
    setTyping(true);
    setSendError(null);
    try {
      await sendChatMessage(sid, q);
    } catch {
      setSendError(lang === 'ar' ? 'لم تُرسل الرسالة. حاول مجدداً.' : lang === 'fr' ? 'Message non envoyé. Réessayez.' : 'Message not sent. Please try again.');
    } finally {
      setTyping(false);
    }
  };

  const quickPrompts =
    lang === 'ar'
      ? [
          'كم سعر التوصيل إلى وهران (31) والجزائر (16)؟',
          'قارن لي هذا الهاتف مع هاتف آخر في المتجر',
          'ما هي أفضل الهواتف المتوفرة تحت 65000 دج؟',
          'احجز لي هذا الهاتف الآن',
        ]
      : lang === 'fr'
        ? [
            'Quel est le tarif de livraison vers Oran (31) ?',
            'Compare ce téléphone avec un autre modèle',
            'Quels modèles avez-vous sous 65 000 DA ?',
            'Je veux commander ce téléphone',
          ]
        : [
            'What is the delivery fee to Oran (31)?',
            'Compare this phone with another model',
            'Best phones under 65,000 DA?',
            'I want to buy this phone now',
          ];

  const side = lang === 'ar' ? '-100%' : '100%';
  const bubble = (s: string) =>
    s === 'customer'
      ? 'ms-auto bg-[#2563EB] text-white'
      : s === 'human_agent'
        ? 'bg-amber-50 text-amber-950 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-100 dark:ring-amber-800'
        : 'bg-white text-slate-800 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800';

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
        aria-label={t(lang, 'bot')}
        initial={{ x: side }}
        animate={{ x: 0 }}
        exit={{ x: side }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        className={`absolute inset-y-0 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-[#0B1120] ${
          lang === 'ar' ? 'left-0' : 'right-0'
        }`}
      >
        {/* Header with Phone Thumbnail */}
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
          {getPreferredProductImageUrl(p.images?.[0]) ? (
            <img
              src={getPreferredProductImageUrl(p.images?.[0])}
              alt={p.name[lang]}
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#2563EB] dark:bg-blue-950/60">
              <Bot size={18} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
              <Sparkles size={14} className="text-[#2563EB]" />
              <span>{t(lang, 'bot')}</span>
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {p.name[lang]} ·{' '}
              <span className="font-mono font-semibold text-[#2563EB] dark:text-blue-400">
                {money(p.price_dzd, lang)}
              </span>
            </p>
          </div>
          <button
            type="button"
            aria-label="إغلاق المحادثة"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Human Escalation Banner */}
        <motion.div
          layout
          className={`px-4 py-2.5 text-center text-xs font-medium transition-colors duration-500 ${
            human
              ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200'
              : 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          {sessionError ? (
            <span role="status">{sessionError}</span>
          ) : human ? (
            <motion.span
              animate={{ opacity: [1, 0.55, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            >
              {t(lang, 'alert')}
            </motion.span>
          ) : (
            <button
              type="button"
              disabled={!sid || typing}
              onClick={() => {
                if (!sid) return;
                setSendError(null);
                setTyping(true);
                sendChatMessage(sid, t(lang, 'human'), 'request_human')
                  .catch(() => setSendError(lang === 'ar' ? 'تعذر إرسال طلب التواصل مع البائع.' : lang === 'fr' ? 'Impossible de contacter le vendeur.' : 'Could not send the human assistance request.'))
                  .finally(() => setTyping(false));
              }}
              className="w-full font-semibold hover:text-[#2563EB] dark:hover:text-blue-400"
            >
              {t(lang, 'human')}
            </button>
          )}
        </motion.div>

        {/* Messages Stream */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-[#F8FAFC] p-4 dark:bg-[#090D16]">
          <div
            className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${bubble(
              'assistant'
            )}`}
          >
            {t(lang, 'hello')}
          </div>

          {/* Quick Suggestion Chips */}
          {(!ses?.messages || ses.messages.length === 0) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickPrompts.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => send(qp)}
                  className="rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-start text-[11px] font-medium text-slate-700 transition hover:border-[#2563EB] hover:text-[#2563EB] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  {qp}
                </button>
              ))}
            </div>
          )}

          {ses?.messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${bubble(
                m.sender
              )}`}
            >
              {m.sender === 'human_agent' && (
                <b className="mb-0.5 block text-[10px] text-amber-700 dark:text-amber-300">
                  🙋‍♂️ البائع (DZPhone)
                </b>
              )}
              {m.content}
            </motion.div>
          ))}

          {sessionError && (
            <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{sessionError}</div>
          )}
          {sendError && (
            <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{sendError}</div>
          )}
          {typing && !human && (
            <div className="w-fit rounded-2xl bg-white px-3.5 py-2 text-xs text-slate-400 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
              •••
            </div>
          )}

          <AnimatePresence>
            {ses?.checkout_unlocked && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                className="rounded-3xl bg-white p-4 shadow-lg ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800"
              >
                <AlgeriaCODCheckoutForm
                  p={p}
                  lang={lang}
                  purchaseMethod="in_site_chat"
                  chatSessionId={sid}
                  discount={ses.checkout_discount_dzd}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={end} />
        </div>

        {/* Input Composer */}
        <div className="flex gap-2 border-t border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-[#0B1120]">
          <input
            aria-label={t(lang, 'ph')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={t(lang, 'ph')}
            className="flex-1 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#2563EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            aria-label={t(lang, 'send')}
            onClick={() => send()}
            disabled:opacity-50 className="grid h-10 w-10 place-items-center rounded-xl bg-[#0F172A] text-white transition hover:bg-[#2563EB] dark:bg-[#2563EB]"
          >
            <Send size={15} className="rtl:-scale-x-100" />
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}
