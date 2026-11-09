import { useState } from 'react';
import { Camera, X } from 'lucide-react';
import type {
  Product,
  ProductAvailability,
  ProductImageItem,
  ProductImageSourceType,
  ProductInspectionDataStatus,
} from '@/data/products';
import { adminCreateProduct, adminPatchProduct, uploadProductImage } from '@/lib/api';
import { numInput } from './admin-shared';
import { getPreferredProductImageUrl } from '@/lib/product-image';

export function ProductEditorModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const isEdit = Boolean(product);
  const [brand, setBrand] = useState(product?.brand || 'Apple');
  const [sku, setSku] = useState(
    product?.sku || `DZ-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [commercialName, setCommercialName] = useState(
    product?.commercial_name || ''
  );
  const [nameAr, setNameAr] = useState(product?.name.ar || '');
  const [nameFr, setNameFr] = useState(product?.name.fr || '');
  const [nameEn, setNameEn] = useState(product?.name.en || '');
  const [condition, setCondition] = useState<'new_sealed' | 'used_like_new'>(
    product?.condition || 'new_sealed'
  );
  const [priceDzd, setPriceDzd] = useState(String(product?.price_dzd ?? 0));
  const [stockQty, setStockQty] = useState(
    String(product?.stock_quantity ?? 0)
  );
  const [availability, setAvailability] = useState<ProductAvailability>(
    product?.availability || 'available'
  );

  // Specs
  const [screenSize, setScreenSize] = useState(
    String(product?.specs.display.size || 6.6)
  );
  const [screenHz, setScreenHz] = useState(
    String(product?.specs.display.hz || 120)
  );
  const [processor, setProcessor] = useState(
    product?.specs.processor || 'Snapdragon 8 Gen 2'
  );
  const [ramGb, setRamGb] = useState(String(product?.specs.ram_gb || 8));
  const [storageGb, setStorageGb] = useState(
    String(product?.specs.storage_gb || 256)
  );
  const [cameraMp, setCameraMp] = useState(
    String(product?.specs.camera.mp || 50)
  );
  const [batteryMah, setBatteryMah] = useState(
    String(product?.specs.battery_mah || 5000)
  );

  // Used X-Ray Inspection
  const [inspectionStatus, setInspectionStatus] =
    useState<ProductInspectionDataStatus>(
      product?.inspection?.data_status || 'illustrative_template'
    );
  const [batteryHealth, setBatteryHealth] = useState(
    String(product?.inspection?.battery_health_percent || 92)
  );
  const [bodyScore, setBodyScore] = useState(
    String(product?.inspection?.body_score_out_of_10 || 9.5)
  );
  const [bodyDescAr, setBodyDescAr] = useState(
    product?.inspection?.body_description.ar ||
      'هيكل نظيف جداً مع فحص كامل للشاشة والبطارية.'
  );

  // Seller Note
  const [noteAr, setNoteAr] = useState(
    product?.seller_personal_note.ar ||
      'هاتف ممتاز ومفحوص بعناية في ورشة DZPhone.'
  );

  // Images Gallery
  const [images, setImages] = useState<ProductImageItem[]>(
    product?.images && product.images.length > 0
      ? product.images
      : [
          {
            url: '/images/products/iphone-15-pro-max-titanium.webp',
            webp_url: '/images/products/iphone-15-pro-max-titanium.webp',
            source_type: 'illustrative_studio_render',
            alt_ar: 'صورة الهاتف',
            sort_order: 0,
          },
        ]
  );
  const [newImgUrl, setNewImgUrl] = useState('');
  const [newImgSourceType, setNewImgSourceType] =
    useState<ProductImageSourceType>('merchant_uploaded_photo');
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleAddImage = () => {
    if (!newImgUrl.trim()) return;
    const url = newImgUrl.trim();
    const isSeeded = url.startsWith('/images/products/');
    setImages([
      ...images,
      {
        url,
        source_type: isSeeded ? 'illustrative_studio_render' : newImgSourceType,
        alt_ar: nameAr || commercialName,
        alt_fr: nameFr || commercialName,
        alt_en: nameEn || commercialName,
        sort_order: images.length,
      },
    ]);
    setNewImgUrl('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const selectedFiles = Array.from(fileList);
    e.target.value = '';
    if (images.length + selectedFiles.length > 20) {
      setImageUploadError('الحد الأقصى 20 صورة لكل هاتف.');
      return;
    }
    setUploadingImages(true);
    setImageUploadError(null);
    try {
      for (const file of selectedFiles) {
        const uploaded = await uploadProductImage(file);
        setImages((prev) => [
          ...prev,
          {
            ...uploaded,
            alt_ar: `${nameAr || commercialName} — صورة حقيقية للجهاز`,
            alt_fr: `${nameFr || commercialName} — Photo réelle de l'appareil`,
            alt_en: `${nameEn || commercialName} — Actual unit photo`,
            sort_order: images.length + selectedFiles.indexOf(file),
          },
        ]);
      }
    } catch (error: any) {
      setImageUploadError(error?.message || 'تعذر رفع الصورة. حاول مجدداً.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (
      condition === 'used_like_new' &&
      inspectionStatus === 'merchant_verified' &&
      Math.max(0, Number(stockQty) || 0) !== 1
    ) {
      setSaveError('كل فحص موثق يجب أن يرتبط بجهاز مستعمل واحد فقط. أنشئ سجلاً مستقلاً لكل وحدة فعلية.');
      return;
    }
    if (
      condition === 'used_like_new' &&
      inspectionStatus === 'merchant_verified' &&
      !images.some(
        (img) =>
          img.source_type === 'merchant_uploaded_photo' &&
          img.url.startsWith('/media/')
      )
    ) {
      setSaveError('لا يمكن اعتماد الفحص قبل رفع صورة حقيقية للجهاز عبر أداة الرفع.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        sku: sku.trim(),
        brand: brand.trim(),
        commercial_name: commercialName.trim() || nameEn.trim() || nameAr.trim(),
        name: {
          ar: nameAr.trim() || commercialName.trim(),
          fr: nameFr.trim() || commercialName.trim() || nameAr.trim(),
          en: nameEn.trim() || commercialName.trim() || nameAr.trim(),
        },
        condition,
        price_dzd: Math.max(1000, Number(priceDzd) || 50000),
        stock_quantity: Math.max(0, Number(stockQty) || 0),
        availability,
        images: images.map((img, i) => ({
          ...img,
          source_type:
            img.source_type ||
            (img.url.startsWith('/images/products/')
              ? 'illustrative_studio_render'
              : 'merchant_uploaded_photo'),
          sort_order: i,
        })),
        specs: {
          display: {
            size: Number(screenSize) || 6.6,
            tech: product?.specs.display.tech || 'AMOLED',
            res: product?.specs.display.res || '1080×2400',
            hz: Number(screenHz) || 120,
          },
          processor: processor.trim(),
          ram_gb: Number(ramGb) || 8,
          storage_gb: Number(storageGb) || 256,
          camera: {
            mp: Number(cameraMp) || 50,
            ois: true,
          },
          battery_mah: Number(batteryMah) || 5000,
        },
        inspection:
          condition === 'used_like_new'
            ? {
                data_status: inspectionStatus,
                battery_health_percent: Math.min(
                  100,
                  Math.max(50, Number(batteryHealth) || 90)
                ),
                body_score_out_of_10: Math.min(
                  10,
                  Math.max(1, Number(bodyScore) || 9.5)
                ),
                body_description: {
                  ar: bodyDescAr,
                  fr:
                    product?.inspection?.body_description.fr ||
                    'Contrôlé par X-Ray.',
                  en:
                    product?.inspection?.body_description.en ||
                    'Checked by X-Ray.',
                },
                accessories:
                  product?.inspection?.accessories || [
                    ['original_box', true],
                    ['cable', true],
                    ['power_adapter', false],
                  ],
              }
            : null,
        seller_personal_note: {
          ar: noteAr,
          fr: product?.seller_personal_note.fr || noteAr,
          en: product?.seller_personal_note.en || noteAr,
        },
      };

      if (isEdit && product) {
        await adminPatchProduct(product.id, payload);
      } else {
        await adminCreateProduct(payload);
      }
      onClose();
    } catch (error: any) {
      setSaveError(error?.message || 'تعذر حفظ بيانات الهاتف. تحقق من الاتصال وحاول مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0F172A]"
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isEdit ? `تعديل الهاتف: ${product?.name.ar}` : 'إضافة هاتف جديد للمتجر'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-slate-500">الماركة (Brand)</span>
              <input
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className={numInput + ' w-full'}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-500">الرمز (SKU)</span>
              <input
                required
                dir="ltr"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className={numInput + ' w-full'}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-500">الاسم التجاري</span>
              <input
                required
                dir="ltr"
                value={commercialName}
                onChange={(e) => setCommercialName(e.target.value)}
                placeholder="iPhone 15 Pro"
                className={numInput + ' w-full'}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-slate-500">الاسم بالعربية</span>
              <input
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className={numInput + ' w-full'}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-500">الاسم بالفرنسية</span>
              <input
                dir="ltr"
                value={nameFr}
                onChange={(e) => setNameFr(e.target.value)}
                className={numInput + ' w-full'}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-500">الاسم بالإنجليزية</span>
              <input
                dir="ltr"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className={numInput + ' w-full'}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-slate-500">الحالة</span>
              <select
                value={condition}
                onChange={(e) =>
                  setCondition(e.target.value as 'new_sealed' | 'used_like_new')
                }
                className={numInput + ' w-full'}
              >
                <option value="new_sealed">جديد مغلق (Scellé)</option>
                <option value="used_like_new">مستعمل مفحوص (X-Ray)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-500">السعر (دج)</span>
              <input
                required
                dir="ltr"
                inputMode="numeric"
                value={priceDzd}
                onChange={(e) => setPriceDzd(e.target.value.replace(/\D/g, ''))}
                className={numInput + ' w-full'}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-500">كمية المخزون</span>
              <input
                required
                dir="ltr"
                inputMode="numeric"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value.replace(/\D/g, ''))}
                className={numInput + ' w-full'}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-500">التوفر</span>
              <select
                value={availability}
                onChange={(e) =>
                  setAvailability(e.target.value as ProductAvailability)
                }
                className={numInput + ' w-full'}
              >
                <option value="available">متاح</option>
                <option value="reserved">محجوز</option>
                <option value="sold">مباع</option>
                <option value="hidden">مخفي</option>
                <option value="draft">مسودة</option>
              </select>
            </label>
          </div>

          {/* Image Gallery Manager */}
          <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                معرض صور الهاتف (الأولى هي الصورة الرئيسية)
              </span>
              <span className="text-[11px] text-slate-500">
                للهواتف المستعملة: ارفع صوراً حقيقية للوحدة المعروضة وحدد نوع الصورة
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <img
                    src={getPreferredProductImageUrl(img) || img.url}
                    alt=""
                    className="h-12 w-14 rounded-lg object-cover"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...images];
                        next[idx] = {
                          ...next[idx],
                          source_type:
                            next[idx].source_type === 'merchant_uploaded_photo'
                              ? 'illustrative_studio_render'
                              : 'merchant_uploaded_photo',
                        };
                        setImages(next);
                      }}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        img.source_type === 'merchant_uploaded_photo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {img.source_type === 'merchant_uploaded_photo'
                        ? '📷 صورة حقيقية'
                        : '🎨 صورة توضيحية'}
                    </button>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...images];
                          const [moved] = next.splice(idx, 1);
                          next.unshift(moved);
                          setImages(next);
                        }}
                        className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#2563EB]"
                      >
                        تعيين كرئيسية
                      </button>
                    )}
                    {images.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setImages(images.filter((_, i) => i !== idx))
                        }
                        className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-600"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <input
                dir="ltr"
                value={newImgUrl}
                onChange={(e) => setNewImgUrl(e.target.value)}
                placeholder="/images/products/... أو رابط صورة مباشر"
                className={numInput + ' flex-1'}
              />
              <select
                value={newImgSourceType}
                onChange={(e) =>
                  setNewImgSourceType(e.target.value as ProductImageSourceType)
                }
                className={numInput}
              >
                <option value="merchant_uploaded_photo">صورة حقيقية للجهاز</option>
                <option value="illustrative_studio_render">صورة استوديو توضيحية</option>
              </select>
              <button
                type="button"
                onClick={handleAddImage}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-slate-700"
              >
                إضافة رابط
              </button>
              <label className="flex cursor-pointer items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Camera size={14} />
                <span>رفع صور حقيقية للجهاز</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingImages}
                />
              </label>
            </div>
            {uploadingImages && (
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">جارٍ رفع الصور إلى تخزين الخادم…</p>
            )}
            {imageUploadError && (
              <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-300">{imageUploadError}</p>
            )}
            {saveError && (
              <p role="alert" className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{saveError}</p>
            )}
          </div>

          {/* Technical Specs */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-slate-500">المعالج</span>
              <input
                dir="ltr"
                value={processor}
                onChange={(e) => setProcessor(e.target.value)}
                className={numInput + ' w-full'}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-500">RAM (GB)</span>
              <input
                dir="ltr"
                value={ramGb}
                onChange={(e) => setRamGb(e.target.value)}
                className={numInput + ' w-full'}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-500">التخزين (GB)</span>
              <input
                dir="ltr"
                value={storageGb}
                onChange={(e) => setStorageGb(e.target.value)}
                className={numInput + ' w-full'}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-slate-500">الكاميرا (MP)</span>
              <input
                dir="ltr"
                value={cameraMp}
                onChange={(e) => setCameraMp(e.target.value)}
                className={numInput + ' w-full'}
              />
            </label>
          </div>

          {condition === 'used_like_new' && (
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 sm:grid-cols-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <label className="block">
                <span className="mb-1 block font-semibold text-emerald-800 dark:text-emerald-300">
                  حالة توثيق الفحص
                </span>
                <select
                  value={inspectionStatus}
                  onChange={(e) =>
                    setInspectionStatus(
                      e.target.value as ProductInspectionDataStatus
                    )
                  }
                  className={numInput + ' w-full'}
                >
                  <option value="illustrative_template">
                    نموذج مرجعي (يُؤكد قبل الشحن)
                  </option>
                  <option value="merchant_verified">
                    فحص موثق للوحدة الفعلية ✓
                  </option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-emerald-800 dark:text-emerald-300">
                  صحة البطارية (%)
                </span>
                <input
                  dir="ltr"
                  value={batteryHealth}
                  onChange={(e) => setBatteryHealth(e.target.value)}
                  className={numInput + ' w-full'}
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-semibold text-emerald-800 dark:text-emerald-300">
                  تقييم الهيكل (/10)
                </span>
                <input
                  dir="ltr"
                  value={bodyScore}
                  onChange={(e) => setBodyScore(e.target.value)}
                  className={numInput + ' w-full'}
                />
              </label>
              <label className="block sm:col-span-3">
                <span className="mb-1 block font-semibold text-emerald-800 dark:text-emerald-300">
                  وصف الفحص الفيزيائي (X-Ray)
                </span>
                <input
                  value={bodyDescAr}
                  onChange={(e) => setBodyDescAr(e.target.value)}
                  className={numInput + ' w-full'}
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-slate-500">
              نصيحة البائع الشخصية (تظهر للزبون)
            </span>
            <textarea
              rows={2}
              value={noteAr}
              onChange={(e) => setNoteAr(e.target.value)}
              className={numInput + ' w-full'}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ بيانات الهاتف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
