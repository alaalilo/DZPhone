import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, Search, Trash2 } from 'lucide-react';
import type {
  Product,
  ProductAvailability,
} from '@/data/products';
import {
  adminDeleteProduct,
  adminPatchProduct,
} from '@/lib/api';
import { useStore } from '@/lib/store';
import { numInput } from './admin-shared';
import { ProductEditorModal } from './ProductEditorModal';
import { getPreferredProductImageUrl } from '@/lib/product-image';

export function ProductsAdminTab() {
  const products = useStore((s) => s.adminProducts);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          !search.trim() ||
          p.name.ar.includes(search) ||
          p.name.fr.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()) ||
          p.brand.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الكود SKU..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 ps-8 pe-3 text-xs outline-none focus:border-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
        >
          <Plus size={15} />
          إضافة هاتف جديد
        </button>
      </div>

      {/* Product Cards List */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((p) => (
          <ProductAdminCard
            key={p.id}
            p={p}
            onEdit={() => setEditing(p)}
          />
        ))}
      </div>

      {(creating || editing) && (
        <ProductEditorModal
          product={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function ProductAdminCard({
  p,
  onEdit,
}: {
  p: Product;
  onEdit: () => void;
}) {
  const [price, setPrice] = useState(String(p.price_dzd));
  const [stock, setStock] = useState(String(p.stock_quantity ?? 0));
  const [availability, setAvailability] = useState<ProductAvailability>(
    p.availability ?? 'available'
  );

  useEffect(() => {
    setPrice(String(p.price_dzd));
    setStock(String(p.stock_quantity ?? 0));
    setAvailability(p.availability ?? 'available');
  }, [p.price_dzd, p.stock_quantity, p.availability]);

  const imgUrl = getPreferredProductImageUrl(p.images?.[0]);
  const isRealPhoto = p.images?.[0]?.source_type === 'merchant_uploaded_photo';
  const isVerifiedInsp = p.inspection?.data_status === 'merchant_verified';

  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex items-start gap-3">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={p.name.ar}
            className="h-16 w-20 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
          />
        ) : (
          <div
            className="h-16 w-20 shrink-0 rounded-xl"
            style={{ background: p.color }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] text-slate-400">
              {p.sku}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                p.condition === 'new_sealed'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {p.condition === 'new_sealed' ? 'جديد مغلق' : 'مستعمل X-Ray'}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                isRealPhoto
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {isRealPhoto ? '📷 صورة حقيقية' : '🎨 صورة استوديو'}
            </span>
            {p.condition === 'used_like_new' && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                  isVerifiedInsp
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {isVerifiedInsp ? '✓ فحص موثق' : 'نموذج مرجعي'}
              </span>
            )}
          </div>
          <h4 className="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-white">
            {p.name.ar}
          </h4>
          <p className="text-[11px] text-slate-500" dir="ltr">
            {p.specs.processor} · {p.specs.ram_gb}/{p.specs.storage_gb}GB
          </p>
        </div>
      </div>

      {/* Quick Inline Controls: Price, Stock, Availability */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div>
          <label className="mb-1 block text-[10px] text-slate-400">
            السعر (دج)
          </label>
          <input
            dir="ltr"
            inputMode="numeric"
            aria-label={`سعر ${p.name.ar}`}
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
            onBlur={() => {
              const val = Number(price);
              if (val > 0 && val !== p.price_dzd) {
                void adminPatchProduct(p.id, { price_dzd: val });
              }
            }}
            className={numInput + ' w-full'}
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] text-slate-400">
            المخزون
          </label>
          <input
            dir="ltr"
            inputMode="numeric"
            aria-label={`مخزون ${p.name.ar}`}
            value={stock}
            onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))}
            onBlur={() => {
              const val = Number(stock);
              if (!Number.isNaN(val) && val >= 0) {
                void adminPatchProduct(p.id, { stock_quantity: val });
              }
            }}
            className={numInput + ' w-full'}
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] text-slate-400">
            الحالة
          </label>
          <select
            aria-label={`حالة ${p.name.ar}`}
            value={availability}
            onChange={(e) => {
              const next = e.target.value as ProductAvailability;
              setAvailability(next);
              void adminPatchProduct(p.id, { availability: next });
            }}
            className={numInput + ' w-full'}
          >
            <option value="available">متاح</option>
            <option value="reserved">محجوز</option>
            <option value="sold">مباع</option>
            <option value="hidden">مخفي</option>
            <option value="draft">مسودة</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <Edit3 size={13} />
          تعديل الصور والمواصفات
        </button>
        <button
          type="button"
          aria-label={`إخفاء أو حذف ${p.name.ar}`}
          onClick={() => void adminDeleteProduct(p.id)}
          className="rounded-xl border border-rose-200 bg-rose-50/60 p-2 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
