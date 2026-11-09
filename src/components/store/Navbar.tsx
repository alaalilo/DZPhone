import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Download,
  Home,
  LayoutDashboard,
  MessageSquare,
  Moon,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Store,
  Sun,
  WifiOff,
  X,
} from 'lucide-react';
import { Lang, t } from '@/lib/i18n';
import { useStore } from '@/lib/store';

export type Filter = 'all' | 'new_sealed' | 'used_like_new';
export type SortOption = 'featured' | 'price_asc' | 'price_desc';

export function Navbar({
  lang,
  setLang,
  filter,
  setFilter,
  brandFilter,
  setBrandFilter,
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
  dark,
  setDark,
  admin,
  setAdmin,
  onOpenCart,
  onOpenDealRoom,
  hideBottomNav = false,
  resultCount = 0,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  brandFilter: string;
  setBrandFilter: (b: string) => void;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
  admin: boolean;
  setAdmin: (a: boolean) => void;
  onOpenCart: () => void;
  onOpenDealRoom?: () => void;
  hideBottomNav?: boolean;
  resultCount?: number;
}) {
  const [evt, setEvt] = useState<any>(null);
  const [installTip, setInstallTip] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const cartCount = useStore((s) =>
    s.cart.reduce((acc, item) => acc + item.quantity, 0)
  );

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e);
    };
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    window.addEventListener('beforeinstallprompt', h);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('beforeinstallprompt', h);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const install = async () => {
    if (evt) {
      evt.prompt();
      setEvt(null);
    } else {
      setInstallTip(true);
      setTimeout(() => setInstallTip(false), 4500);
    }
  };

  const F: [Filter, string][] = [
    ['all', 'all'],
    ['new_sealed', 'fNew'],
    ['used_like_new', 'fUsed'],
  ];

  const brands = ['all', 'Apple', 'Samsung', 'Redmi', 'POCO'];

  const activeFilterCount =
    (filter !== 'all' ? 1 : 0) +
    (brandFilter !== 'all' ? 1 : 0) +
    (sortBy !== 'featured' ? 1 : 0);

  const cycleLanguage = () => {
    const order: Lang[] = ['ar', 'fr', 'en'];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLang(next);
  };

  return (
    <>
      {/* Sticky Header — Compact 56px on Mobile, Full Bar on Desktop */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-[#0B1120]/95">
        {/* Offline Banner */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-amber-500/95 text-xs font-medium text-slate-950"
            >
              <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5">
                <WifiOff size={14} />
                <span>{t(lang, 'offlineBanner')}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary Top Bar */}
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-auto sm:flex-wrap sm:gap-3 sm:px-6 sm:py-3">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => {
              if (admin) setAdmin(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex min-h-[44px] items-center gap-2.5 text-start font-bold tracking-tight text-slate-900 dark:text-white"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0F172A] text-white shadow-xs dark:bg-[#2563EB]">
              <Smartphone size={18} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-sm font-extrabold leading-none sm:text-base">
                {t(lang, 'brand')}
              </span>
              <span className="mt-0.5 hidden text-[10px] font-normal text-slate-500 sm:block dark:text-slate-400">
                {t(lang, 'tagline')}
              </span>
            </div>
          </button>

          {/* Desktop Search Input (Hidden on mobile header; mobile has dedicated discovery bar below) */}
          {!admin && (
            <div className="relative hidden md:mx-auto md:block md:max-w-md lg:flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute top-1/2 start-3.5 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                aria-label={t(lang, 'searchPh')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(lang, 'searchPh')}
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/80 py-2 ps-9 pe-8 text-xs text-slate-900 outline-none transition focus:border-[#2563EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 end-2.5 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Mobile Compact Header Actions (< md): Uncluttered 44x44px Controls */}
          <div className="flex items-center gap-1.5 md:hidden">
            {/* Compact Language Pill */}
            <button
              type="button"
              onClick={cycleLanguage}
              aria-label="Switch language"
              className="flex h-11 min-w-[44px] items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 text-xs font-bold uppercase text-slate-800 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              {lang}
            </button>

            {/* Theme Toggle on Mobile */}
            <button
              type="button"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDark(!dark)}
              className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-700 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>


          </div>

          {/* Desktop Right Controls (md:flex — Exact Desktop Layout Preserved) */}
          <div className="ms-auto hidden items-center gap-2 md:flex">
            {/* Language Switcher */}
            <div
              className="relative flex rounded-xl border border-slate-200/80 bg-slate-100/80 p-0.5 text-[11px] font-semibold dark:border-slate-800 dark:bg-slate-900"
              role="group"
              aria-label="Language switcher"
            >
              {(['ar', 'fr', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`relative z-10 rounded-lg px-2.5 py-1 uppercase transition-colors ${
                    lang === l
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {lang === l && (
                    <motion.span
                      layoutId="lang-pill"
                      className="absolute inset-0 -z-10 rounded-lg bg-[#0F172A] dark:bg-[#2563EB]"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  {l}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDark(!dark)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Shopping Bag Drawer Trigger */}
            {!admin && (
              <button
                type="button"
                aria-label={t(lang, 'cartTitle')}
                onClick={onOpenCart}
                className="relative flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <ShoppingBag size={15} className="text-[#2563EB]" />
                <span className="tabular-nums">{cartCount}</span>
              </button>
            )}

            {/* Admin / Storefront Switch */}
            <button
              type="button"
              onClick={() => setAdmin(!admin)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {admin ? <Store size={14} /> : <LayoutDashboard size={14} />}
              <span>{t(lang, admin ? 'shop' : 'admin')}</span>
            </button>

            {/* PWA Install Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={install}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-[#2563EB] px-3 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
            >
              <Download size={14} />
              <span>{t(lang, 'install')}</span>
            </motion.button>
          </div>
        </div>

        {/* PWA Install Tip */}
        <AnimatePresence>
          {installTip && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-blue-50 text-xs text-blue-950 dark:bg-blue-950/70 dark:text-blue-200"
            >
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
                <span>
                  {lang === 'ar'
                    ? 'لتثبيت تطبيق DZPhone: افتح قائمة المتصفح واختر «إضافة إلى الشاشة الرئيسية».'
                    : lang === 'fr'
                      ? "Menu du navigateur → « Ajouter à l'écran d'accueil » pour installer DZPhone."
                      : 'Browser menu → “Add to Home Screen” to install the DZPhone app.'}
                </span>
                <button
                  type="button"
                  aria-label="Close install tip"
                  onClick={() => setInstallTip(false)}
                  className="p-1 text-blue-700 dark:text-blue-300"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Catalog Filter & Sort Bar (md:block — Unchanged on Desktop) */}
        {!admin && (
          <div className="hidden border-t border-slate-100 bg-slate-50/60 md:block dark:border-slate-800/80 dark:bg-slate-900/40">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
              {/* Condition Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {F.map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFilter(k)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      filter === k
                        ? 'bg-[#0F172A] text-white dark:bg-[#2563EB]'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200/80 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800'
                    }`}
                  >
                    {t(lang, label)}
                  </button>
                ))}
              </div>

              {/* Brand & Sort Selectors */}
              <div className="flex items-center gap-2 overflow-x-auto">
                <div className="flex items-center gap-1">
                  {brands.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBrandFilter(b)}
                      className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                        brandFilter === b
                          ? 'bg-blue-50 text-[#2563EB] ring-1 ring-[#2563EB]/30 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {b === 'all'
                        ? lang === 'ar'
                          ? 'كل الماركات'
                          : lang === 'fr'
                            ? 'Marques'
                            : 'All Brands'
                        : b}
                    </button>
                  ))}
                </div>

                <select
                  aria-label="Sort products"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="featured">{t(lang, 'sortFeatured')}</option>
                  <option value="price_asc">{t(lang, 'sortPriceAsc')}</option>
                  <option value="price_desc">{t(lang, 'sortPriceDesc')}</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Search & Scrollable Filter Chips Strip (md:hidden, non-sticky so viewport stays open) */}
      {!admin && (
        <div className="border-b border-slate-200/70 bg-white px-4 py-3 md:hidden dark:border-slate-800/80 dark:bg-[#0B1120]">
          <div className="flex items-center gap-2">
            {/* Full-width Mobile Search */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 start-3.5 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                aria-label={t(lang, 'searchPh')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(lang, 'searchPh')}
                className="h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50 ps-10 pe-9 text-sm text-slate-900 outline-none transition focus:border-[#2563EB] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 end-2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Mobile Filter & Sort Bottom Sheet Trigger */}
            <button
              type="button"
              aria-label={t(lang, 'filtersTitle')}
              onClick={() => setMobileSheetOpen(true)}
              className={`relative flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition active:scale-95 ${
                activeFilterCount > 0
                  ? 'border-[#2563EB] bg-blue-50 text-[#2563EB] dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'border-slate-200/90 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              <SlidersHorizontal size={15} />
              <span>{t(lang, 'navFilters')}</span>
              {activeFilterCount > 0 && (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-[#2563EB] text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>


        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar (md:hidden, hidden when modals/drawers open) */}
      {!admin && !hideBottomNav && !mobileSheetOpen && (
        <nav
          aria-label="Mobile bottom navigation"
          className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-white/95 px-2 pt-1.5 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-[#0B1120]/95"
        >
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setBrandFilter('all');
                setSearchQuery('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl text-[#2563EB] dark:text-blue-400"
            >
              <Home size={19} />
              <span className="text-[11px] font-bold">{t(lang, 'navHome')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                document.getElementById('product-catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <Smartphone size={19} />
              <span className="text-[11px] font-semibold">{t(lang, 'navProducts')}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenDealRoom?.()}
              className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <MessageSquare size={19} />
              <span className="text-[11px] font-semibold">
                {t(lang, 'navChat')}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              className="relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ShoppingBag size={19} />
              <span className="text-[11px] font-semibold">
                {t(lang, 'navCart')}
              </span>
              {cartCount > 0 && (
                <span className=" -top-0.5 absolute end-5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#2563EB] px-1 font-mono text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </nav>
      )}

      {/* Mobile Filter, Sort & Store Settings Bottom Sheet */}
      <AnimatePresence>
        {mobileSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSheetOpen(false)}
            className="fixed inset-0 z-50 flex items-end bg-slate-950/55 backdrop-blur-xs md:hidden"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t(lang, 'filtersTitle')}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="pb-safe max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0F172A]"
            >
              {/* Grab handle */}
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />

              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {t(lang, 'filtersTitle')}
                </h2>
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setMobileSheetOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200/80 text-slate-500 dark:border-slate-800 dark:text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                {/* Condition */}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t(lang, 'filterCondition')}
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {F.map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setFilter(k)}
                        className={`flex min-h-[46px] items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                          filter === k
                            ? 'border-[#2563EB] bg-blue-50/70 text-[#2563EB] dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        <span>{t(lang, label)}</span>
                        {filter === k && (
                          <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand */}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t(lang, 'filterBrand')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {brands.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBrandFilter(b)}
                        className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition ${
                          brandFilter === b
                            ? 'border-[#2563EB] bg-blue-50/70 text-[#2563EB] dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        {b === 'all'
                          ? lang === 'ar'
                            ? 'الكل'
                            : lang === 'fr'
                              ? 'Toutes'
                              : 'All'
                          : b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t(lang, 'filterSort')}
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {(
                      [
                        ['featured', 'sortFeatured'],
                        ['price_asc', 'sortPriceAsc'],
                        ['price_desc', 'sortPriceDesc'],
                      ] as [SortOption, string][]
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setSortBy(k)}
                        className={`flex min-h-[46px] items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                          sortBy === k
                            ? 'border-[#2563EB] bg-blue-50/70 text-[#2563EB] dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        <span>{t(lang, label)}</span>
                        {sortBy === k && (
                          <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language & Secondary Store Actions */}
                <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['ar', 'العربية'],
                        ['fr', 'Français'],
                        ['en', 'English'],
                      ] as [Lang, string][]
                    ).map(([l, label]) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLang(l)}
                        className={`min-h-[44px] rounded-xl border text-xs font-bold transition ${
                          lang === l
                            ? 'border-[#0F172A] bg-[#0F172A] text-white dark:border-[#2563EB] dark:bg-[#2563EB]'
                            : 'border-slate-200/80 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileSheetOpen(false);
                        install();
                      }}
                      className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <Download size={15} className="text-[#2563EB]" />
                      <span>{t(lang, 'install')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileSheetOpen(false);
                        setAdmin(true);
                      }}
                      className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <LayoutDashboard size={15} />
                      <span>{t(lang, 'admin')}</span>
                    </button>
                  </div>
                </div>

                {/* Sheet Bottom Sticky Actions */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFilter('all');
                      setBrandFilter('all');
                      setSortBy('featured');
                      setSearchQuery('');
                    }}
                    className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-slate-200 px-4 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                  >
                    <RotateCcw size={14} />
                    <span>{t(lang, 'resetFilters')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMobileSheetOpen(false)}
                    className="flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-[#2563EB] px-5 text-sm font-bold text-white shadow-sm"
                  >
                    {t(lang, 'applyFilters')} ({resultCount})
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
