import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import type { Product } from '@/data/products';
import { DIR, Lang, money, t } from '@/lib/i18n';
import { getProducts, getStoreSettings, getWilayas } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Filter, Navbar, SortOption } from '@/components/store/Navbar';
import { ProductCard } from '@/components/store/ProductCard';
import { ProductDialog } from '@/components/store/ProductDialog';
import { SmartDealRoomDrawer } from '@/components/store/SmartDealRoomDrawer';
import { CartDrawer } from '@/components/store/CartDrawer';
import { StoreFooter } from '@/components/store/StoreFooter';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { getPreferredProductImageUrl } from '@/lib/product-image';

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = window.localStorage.getItem('dzphone_lang_v1');
      if (saved === 'ar' || saved === 'fr' || saved === 'en') return saved;
    } catch {
      /* ignore */
    }
    return 'ar';
  });

  const [dark, setDarkState] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('dzphone_theme_v1') === 'dark';
    } catch {
      return false;
    }
  });

  const [filter, setFilter] = useState<Filter>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [admin, setAdmin] = useState(false);

  const [sel, setSel] = useState<Product | null>(null);
  const [view, setView] = useState<'detail' | 'checkout'>('detail');
  const [chat, setChat] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const catalogRef = useRef<HTMLElement>(null);
  const initialProductSyncedRef = useRef(false);
  const products = useStore((s) => s.products);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem('dzphone_lang_v1', l);
    } catch {
      /* ignore */
    }
  };

  const setDark = (d: boolean) => {
    setDarkState(d);
    try {
      window.localStorage.setItem('dzphone_theme_v1', d ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void getProducts();
    void getWilayas();
    void getStoreSettings();
    // Telegram/admin deep links are navigation hints only; authentication is still required.
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') setAdmin(true);
  }, []);

  // Open product from shareable URL query /?product=<id> on initial load
  useEffect(() => {
    if (initialProductSyncedRef.current || products.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const productId = params.get('product');
      if (productId) {
        const matched = products.find((p) => p.id === productId);
        if (matched) {
          setSel(matched);
          initialProductSyncedRef.current = true;
        }
      } else {
        initialProductSyncedRef.current = true;
      }
    } catch {
      initialProductSyncedRef.current = true;
    }
  }, [products]);

  // Keep browser URL synchronized with selected product for direct sharing (/?product=<id>)
  useEffect(() => {
    if (!initialProductSyncedRef.current) return;
    try {
      const url = new URL(window.location.href);
      if (sel) {
        url.searchParams.set('product', sel.id);
      } else {
        url.searchParams.delete('product');
      }
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {
      /* ignore */
    }
  }, [sel]);

  useEffect(() => {
    document.documentElement.dir = admin ? 'rtl' : DIR[lang];
    document.documentElement.lang = lang;
  }, [lang, admin]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSel(null);
        setView('detail');
        setChat(false);
        setCartOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Inject dynamic Schema.org JSON-LD for Store + Product catalog
  useEffect(() => {
    const scriptId = 'dzphone-jsonld-schema';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: 'DZPhone Algeria',
      description: t(lang, 'heroSub'),
      currenciesAccepted: 'DZD',
      paymentAccepted: 'Cash on Delivery',
      areaServed: 'DZ',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Smartphones Catalog',
        itemListElement: products.map((p) => ({
          '@type': 'Product',
          name: p.name[lang],
          sku: p.sku,
          brand: { '@type': 'Brand', name: p.brand },
          image: getPreferredProductImageUrl(p.images?.[0]) || '',
          offers: {
            '@type': 'Offer',
            price: p.price_dzd,
            priceCurrency: 'DZD',
            availability:
              ['sold', 'reserved', 'hidden', 'draft'].includes(p.availability || '') || (p.stock_quantity ?? 0) <= 0
                ? 'https://schema.org/OutOfStock'
                : 'https://schema.org/InStock',
          },
        })),
      },
    };
    script.textContent = JSON.stringify(jsonLd);
  }, [products, lang]);

  const list = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (filter !== 'all' && p.condition !== filter) return false;
      if (
        brandFilter !== 'all' &&
        p.brand.toLowerCase() !== brandFilter.toLowerCase()
      )
        return false;
      if (!q) return true;
      return (
        p.name.ar.toLowerCase().includes(q) ||
        p.name.fr.toLowerCase().includes(q) ||
        p.name.en.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.commercial_name.toLowerCase().includes(q) ||
        p.specs.processor.toLowerCase().includes(q) ||
        String(p.specs.storage_gb).includes(q)
      );
    });

    if (sortBy === 'price_asc') {
      return [...filtered].sort((a, b) => a.price_dzd - b.price_dzd);
    }
    if (sortBy === 'price_desc') {
      return [...filtered].sort((a, b) => b.price_dzd - a.price_dzd);
    }
    return filtered;
  }, [products, filter, brandFilter, sortBy, searchQuery]);

  const flagshipHeroProduct = products[0];

  const close = () => {
    setSel(null);
    setView('detail');
    setChat(false);
  };

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] pb-20 text-[#0F172A] transition-colors md:pb-0 dark:bg-[#090D16] dark:text-[#F8FAFC]"
      style={{
        fontFamily:
          lang === 'ar' || admin
            ? 'var(--font-sans-ar)'
            : 'var(--font-sans-latin)',
      }}
    >
      <Navbar
        lang={lang}
        setLang={setLang}
        filter={filter}
        setFilter={setFilter}
        brandFilter={brandFilter}
        setBrandFilter={setBrandFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dark={dark}
        setDark={setDark}
        admin={admin}
        setAdmin={(a) => {
          close();
          setAdmin(a);
        }}
        onOpenCart={() => setCartOpen(true)}
        onOpenDealRoom={() => {
          if (flagshipHeroProduct) {
            setSel(flagshipHeroProduct);
            setChat(true);
          }
        }}
        hideBottomNav={Boolean(sel || cartOpen || chat)}
        resultCount={list.length}
      />

      {admin ? (
        <AdminDashboard />
      ) : (
        <>
          {/* Section 1: Storefront Split Hero & Trust Architecture */}
          {!searchQuery && filter === 'all' && brandFilter === 'all' && (
            <section className="border-b border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-[#0B1120]">
              <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:py-12">
                <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-8">
                  {/* Hero Copy & CTAs */}
                  <div className="space-y-4 sm:space-y-5 lg:col-span-7">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 sm:text-xs dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <ShieldCheck size={14} className="shrink-0 text-[#10B981]" />
                      <span className="truncate">{t(lang, 'heroBadge')}</span>
                    </div>

                    <h1 className="text-xl font-extrabold leading-snug tracking-tight text-slate-900 sm:text-4xl lg:text-[2.6rem] lg:leading-tight dark:text-white">
                      {t(lang, 'heroTitle')}
                    </h1>

                    <p className="max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
                      {t(lang, 'heroSub')}
                    </p>

                    <div className="grid grid-cols-1 gap-2.5 pt-1 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          catalogRef.current?.scrollIntoView({
                            behavior: 'smooth',
                          })
                        }
                        className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:bg-[#2563EB] dark:hover:bg-blue-600"
                      >
                        <span>{t(lang, 'heroCtaCatalog')}</span>
                        <ArrowDown size={15} />
                      </button>

                      {flagshipHeroProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            setSel(flagshipHeroProduct);
                            setChat(true);
                          }}
                          className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-[#2563EB] hover:text-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <MessageSquare size={15} className="text-[#2563EB]" />
                          <span>{t(lang, 'heroCtaDealRoom')}</span>
                        </button>
                      )}
                    </div>

                    {/* 3 Trust Pillars (Compact on Mobile, Full Grid on sm+) */}
                    <div className="grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-4 sm:grid-cols-3 sm:gap-3 sm:pt-5 dark:border-slate-800/80">
                      <div className="flex items-center gap-2.5 sm:items-start">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#2563EB] dark:bg-blue-950/60">
                          <Truck size={15} />
                        </span>
                        <div className="min-w-0">
                          <b className="block text-xs text-slate-900 dark:text-white">
                            {t(lang, 'trustWilayasTitle')}
                          </b>
                          <span className="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">
                            {t(lang, 'trustWilayasDesc')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 sm:items-start">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[#10B981] dark:bg-emerald-950/60">
                          <Sparkles size={15} />
                        </span>
                        <div className="min-w-0">
                          <b className="block text-xs text-slate-900 dark:text-white">
                            {t(lang, 'trustXrayTitle')}
                          </b>
                          <span className="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">
                            {t(lang, 'trustXrayDesc')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 sm:items-start">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60">
                          <ShieldCheck size={15} />
                        </span>
                        <div className="min-w-0">
                          <b className="block text-xs text-slate-900 dark:text-white">
                            {t(lang, 'trustCodTitle')}
                          </b>
                          <span className="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">
                            {t(lang, 'trustCodDesc')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hero Featured Studio Showcase (Desktop & Tablet) */}
                  {flagshipHeroProduct && (
                    <div className="hidden sm:block lg:col-span-5">
                      <div
                        onClick={() => setSel(flagshipHeroProduct)}
                        className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-200/80 bg-[#F1F5F9] shadow-xl dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="aspect-[4/3] overflow-hidden">
                          <img
                            src={getPreferredProductImageUrl(flagshipHeroProduct.images?.[0])}
                            alt={flagshipHeroProduct.name[lang]}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex items-center justify-between bg-white/95 p-4 backdrop-blur-md dark:bg-slate-900/95">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-blue-400">
                              {flagshipHeroProduct.brand} · {flagshipHeroProduct.condition === 'new_sealed'
                                ? t(lang, 'sealed')
                                : flagshipHeroProduct.inspection?.data_status === 'merchant_verified'
                                  ? `X-Ray ${flagshipHeroProduct.inspection.battery_health_percent}%`
                                  : t(lang, 'inspectionPending')}
                            </span>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                              {flagshipHeroProduct.name[lang]}
                            </h2>
                          </div>
                          <span className="font-mono text-base font-extrabold tabular-nums text-slate-900 dark:text-white">
                            {money(flagshipHeroProduct.price_dzd, lang)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Section 2: Featured Product Catalog Grid */}
          <motion.main
            id="product-catalog"
            ref={catalogRef}
            key={lang}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8"
          >
            {list.length === 0 ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center sm:p-12 dark:border-slate-800 dark:bg-[#111827]">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {lang === 'ar'
                    ? 'لم يتم العثور على هواتف مطابقة لبحثك. جرب تغيير الفلتر أو كلمة البحث.'
                    : lang === 'fr'
                      ? 'Aucun téléphone ne correspond à votre recherche.'
                      : 'No phones matched your search criteria.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilter('all');
                    setBrandFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-4 min-h-[44px] rounded-xl bg-[#2563EB] px-5 py-2.5 text-xs font-bold text-white"
                >
                  {t(lang, 'all')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {list.map((p, i) => (
                    <ProductCard
                      key={p.id}
                      p={p}
                      lang={lang}
                      i={i}
                      onOpen={() => setSel(p)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.main>

          {/* Section 3: Store Footer & Policies */}
          <StoreFooter lang={lang} />

          {/* Modals & Drawers */}
          <AnimatePresence>
            {sel && !chat && (
              <ProductDialog
                p={sel}
                lang={lang}
                view={view}
                setView={setView}
                onClose={close}
                onChat={() => setChat(true)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {sel && chat && (
              <SmartDealRoomDrawer p={sel} lang={lang} onClose={close} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {cartOpen && (
              <CartDrawer lang={lang} onClose={() => setCartOpen(false)} />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
