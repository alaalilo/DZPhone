import crypto from "node:crypto";
import { and, asc, desc, eq, gt, inArray, ne } from "drizzle-orm";
import { db } from "./index.ts";
import {
  chatMessages,
  chatSessions,
  notificationOutbox,
  orderItems,
  orders,
  products,
  storeSettings,
  wilayasShipping,
  type ProductImage,
  type ProductInspectionJson,
  type ProductSpecsJson,
} from "./schema.ts";
import WILAYAS_SEED from "../data/wilayas-69.seed.json" with { type: "json" };
import {
  PRODUCTS,
  type Product,
  type ProductAvailability,
} from "../data/products.ts";
import {
  canTransitionOrderStatus,
  computeOrderTotals,
  normalizeAlgerianMobile,
  type OrderStatus,
  type ShippingMethod,
} from "../lib/domain-rules.ts";

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      for (const row of WILAYAS_SEED) {
        const parentCode = (row as { parent_wilaya_code?: string | null }).parent_wilaya_code ?? null;
        await db
          .insert(wilayasShipping)
          .values({
            code: row.code,
            nameAr: row.name_ar,
            nameFr: row.name_fr,
            nameEn: row.name_en,
            homeDeliveryPrice: row.home_delivery_price,
            stopDeskPrice: row.stop_desk_price,
            isActive: row.is_active,
            parentWilayaCode: parentCode,
          })
          .onConflictDoUpdate({
            target: wilayasShipping.code,
            set: {
              nameAr: row.name_ar,
              nameFr: row.name_fr,
              nameEn: row.name_en,
              parentWilayaCode: parentCode,
            },
          });
      }

      for (const p of PRODUCTS) {
        const seedImages: ProductImage[] = p.images ?? [];
        await db
          .insert(products)
          .values({
            id: p.id,
            sku: p.sku,
            brand: p.brand,
            commercialName: p.commercial_name,
            color: p.color,
            nameAr: p.name.ar,
            nameFr: p.name.fr,
            nameEn: p.name.en,
            descriptionAr: p.seller_personal_note.ar,
            descriptionFr: p.seller_personal_note.fr,
            descriptionEn: p.seller_personal_note.en,
            priceDzd: p.price_dzd,
            condition: p.condition,
            batteryHealthPercent:
              p.inspection?.data_status === "merchant_verified"
                ? p.inspection.battery_health_percent
                : null,
            screenCondition:
              p.inspection?.data_status === "merchant_verified" ? "excellent" : null,
            bodyCondition:
              p.inspection?.data_status === "merchant_verified" ? "excellent" : null,
            accessories:
              p.inspection?.data_status === "merchant_verified"
                ? p.inspection.accessories.filter(([, ok]) => ok).map(([k]) => k)
                : [],
            sellerNote: p.seller_personal_note.ar,
            ramGb: String(p.specs.ram_gb),
            storageGb: p.specs.storage_gb,
            processor: p.specs.processor,
            camera: `${p.specs.camera.mp}MP`,
            batteryMah: p.specs.battery_mah,
            specsJson: p.specs,
            inspectionJson: p.inspection ?? null,
            sellerPersonalNoteJson: p.seller_personal_note,
            images: seedImages,
            availability: p.availability ?? "available",
            stockQuantity: p.stock_quantity ?? 0,
          })
          .onConflictDoUpdate({
            target: products.id,
            set: {
              brand: p.brand,
              commercialName: p.commercial_name,
              nameAr: p.name.ar,
              nameFr: p.name.fr,
              nameEn: p.name.en,
            },
          });
      }

      await db
        .insert(storeSettings)
        .values({
          key: "default",
          whatsapp: "",
          instagram: "dzphone",
          messenger: "dzphone",
        })
        .onConflictDoNothing({ target: storeSettings.key });

      // Clear legacy placeholder WhatsApp number if still present
      await db
        .update(storeSettings)
        .set({ whatsapp: "" })
        .where(
          and(
            eq(storeSettings.key, "default"),
            eq(storeSettings.whatsapp, "213555000000")
          )
        );
    } catch (error) {
      seedPromise = null;
      console.error("Database seed failed:", error);
      throw new Error("Database initialization failed.", { cause: error });
    }
  })();
  return seedPromise;
}

function mapProductRowToDto(row: typeof products.$inferSelect): Product {
  const fallback = PRODUCTS.find((x) => x.id === row.id) ?? PRODUCTS[0];
  const specs = row.specsJson ?? fallback.specs;
  // Only seeded products may use their explicitly marked reference template.
  // New used-device records without an inspection must not inherit another
  // phone's illustrative battery/body readings.
  // Inspection is never inferred from the seed catalog. Only an explicit database
  // record may be represented as an inspection of the product currently offered.
  const inspection =
    row.condition === "used_like_new" ? row.inspectionJson ?? null : undefined;
  const sellerNote =
    row.sellerPersonalNoteJson ?? fallback.seller_personal_note;
  // An intentionally empty image gallery stays empty; do not resurrect seed images.
  const rawImages = Array.isArray(row.images) ? row.images : fallback.images ?? [];

  const normalizedImages = rawImages.map((img, idx) => {
    const isSeededStudio = img.url.startsWith("/images/products/");
    const inferredWebp =
      img.webp_url ||
      (isSeededStudio && img.url.endsWith(".jpg")
        ? img.url.replace(/\.jpg$/, ".webp")
        : undefined);
    const inferredSourceType =
      img.source_type ||
      (isSeededStudio
        ? "illustrative_studio_render"
        : "merchant_uploaded_photo");
    return {
      ...img,
      webp_url: inferredWebp,
      source_type: inferredSourceType,
      sort_order: typeof img.sort_order === "number" ? img.sort_order : idx,
    };
  });

  return {
    id: row.id,
    sku: row.sku,
    brand: row.brand || fallback.brand,
    commercial_name: row.commercialName || fallback.commercial_name,
    name: {
      ar: row.nameAr,
      fr: row.nameFr,
      en: row.nameEn,
    },
    condition: row.condition,
    price_dzd: row.priceDzd,
    color: row.color || fallback.color,
    availability: row.availability as ProductAvailability,
    stock_quantity: row.stockQuantity,
    images: [...normalizedImages].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    ),
    specs,
    ...(inspection
      ? {
          inspection: {
            ...inspection,
            data_status:
              inspection.data_status === "merchant_verified"
                ? "merchant_verified"
                : "illustrative_template",
            battery_health_percent:
              row.batteryHealthPercent ?? inspection.battery_health_percent,
          },
        }
      : {}),
    seller_personal_note: sellerNote,
  };
}

export async function listAvailableProducts(): Promise<Product[]> {
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(products)
      .where(ne(products.availability, "hidden"))
      .orderBy(asc(products.createdAt));
    return rows
      .filter((r) => r.availability !== "draft")
      .map(mapProductRowToDto);
  } catch (error) {
    console.error("Failed to list products:", error);
    throw new Error("Failed to query products.", { cause: error });
  }
}

export async function listAllAdminProducts(): Promise<Product[]> {
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(products)
      .orderBy(desc(products.updatedAt));
    return rows.map(mapProductRowToDto);
  } catch (error) {
    console.error("Failed to list all admin products:", error);
    throw new Error("Failed to query admin products.", { cause: error });
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    await ensureSeeded();
    const [row] = await db.select().from(products).where(eq(products.id, id));
    return row ? mapProductRowToDto(row) : null;
  } catch (error) {
    console.error("Failed to fetch product by ID:", error);
    throw new Error("Failed to query product.", { cause: error });
  }
}

/** Public lookup: never expose hidden or draft products through public routes or AI tools. */
export async function getPublicProductById(id: string): Promise<Product | null> {
  try {
    await ensureSeeded();
    const [row] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          ne(products.availability, "hidden"),
          ne(products.availability, "draft")
        )
      );
    return row ? mapProductRowToDto(row) : null;
  } catch (error) {
    console.error("Failed to fetch public product by ID:", error);
    throw new Error("Failed to query product.", { cause: error });
  }
}

export async function createProductInDb(input: {
  id?: string;
  sku: string;
  brand: string;
  commercial_name: string;
  name: { ar: string; fr: string; en: string };
  condition: "new_sealed" | "used_like_new";
  price_dzd: number;
  color?: string;
  availability?: ProductAvailability;
  stock_quantity?: number;
  images?: ProductImage[];
  specs: ProductSpecsJson;
  inspection?: ProductInspectionJson | null;
  seller_personal_note: { ar: string; fr: string; en: string };
}): Promise<Product> {
  try {
    await ensureSeeded();
    const slugBase = (input.id || input.commercial_name || input.sku)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const id =
      input.id ||
      `${slugBase}-${crypto.randomBytes(2).toString("hex")}`.slice(0, 120);

    const stockQty = Math.max(0, Math.floor(input.stock_quantity ?? 0));
    if (input.condition === "used_like_new" && input.inspection?.data_status === "merchant_verified") {
      if (stockQty !== 1) {
        throw new Error("كل فحص موثق يجب أن يرتبط بوحدة مستعملة واحدة فقط. أنشئ سجلاً مستقلاً لكل جهاز.");
      }
      if (!(input.images ?? []).some((img) =>
        img.source_type === "merchant_uploaded_photo" && img.url.startsWith("/media/")
      )) {
        throw new Error("الفحص الموثق يتطلب صورة حقيقية مرفوعة للجهاز الفعلي.");
      }
    }
    const availability =
      stockQty === 0
        ? "sold"
        : (input.availability ?? "available");

    const [created] = await db
      .insert(products)
      .values({
        id,
        sku: input.sku.trim().toUpperCase(),
        brand: input.brand.trim(),
        commercialName: input.commercial_name.trim(),
        color: input.color || "#0F172A",
        nameAr: input.name.ar.trim(),
        nameFr: input.name.fr.trim(),
        nameEn: input.name.en.trim(),
        descriptionAr: input.seller_personal_note.ar,
        descriptionFr: input.seller_personal_note.fr,
        descriptionEn: input.seller_personal_note.en,
        priceDzd: Math.max(1000, Math.floor(input.price_dzd)),
        condition: input.condition,
        batteryHealthPercent:
          input.condition === "used_like_new" && input.inspection?.data_status === "merchant_verified"
            ? input.inspection.battery_health_percent
            : null,
        screenCondition:
          input.condition === "used_like_new" && input.inspection?.data_status === "merchant_verified" ? "excellent" : null,
        bodyCondition:
          input.condition === "used_like_new" && input.inspection?.data_status === "merchant_verified" ? "excellent" : null,
        accessories:
          input.condition === "used_like_new" && input.inspection?.data_status === "merchant_verified"
            ? input.inspection.accessories.filter(([, ok]) => ok).map(([k]) => k)
            : [],
        sellerNote: input.seller_personal_note.ar,
        ramGb: String(input.specs.ram_gb),
        storageGb: input.specs.storage_gb,
        processor: input.specs.processor,
        camera: `${input.specs.camera.mp}MP`,
        batteryMah: input.specs.battery_mah,
        specsJson: input.specs,
        inspectionJson:
          input.condition === "used_like_new" ? input.inspection ?? null : null,
        sellerPersonalNoteJson: input.seller_personal_note,
        images: input.images ?? [],
        availability,
        stockQuantity: stockQty,
      })
      .returning();

    return mapProductRowToDto(created);
  } catch (error: any) {
    console.error("Failed to create product:", error);
    throw new Error(error?.message || "Failed to create product.", {
      cause: error,
    });
  }
}

export async function updateProductInDb(
  id: string,
  patch: {
    sku?: string;
    brand?: string;
    commercial_name?: string;
    name?: { ar: string; fr: string; en: string };
    price_dzd?: number;
    condition?: "new_sealed" | "used_like_new";
    color?: string;
    availability?: ProductAvailability;
    stock_quantity?: number;
    battery_health_percent?: number;
    images?: ProductImage[];
    specs?: ProductSpecsJson;
    inspection?: ProductInspectionJson | null;
    seller_personal_note?: { ar: string; fr: string; en: string };
  }
): Promise<Product | null> {
  try {
    await ensureSeeded();
    const [existing] = await db.select().from(products).where(eq(products.id, id));
    if (!existing) return null;
    const finalCondition = patch.condition ?? existing.condition;
    const finalStock = patch.stock_quantity === undefined
      ? existing.stockQuantity
      : Math.max(0, Math.floor(patch.stock_quantity));
    const finalInspection = patch.inspection === undefined
      ? existing.inspectionJson
      : patch.inspection;
    const finalImages = patch.images ?? (Array.isArray(existing.images) ? existing.images : []);
    if (finalCondition === "used_like_new" && finalInspection?.data_status === "merchant_verified") {
      if (finalStock !== 1) {
        throw new Error("كل فحص موثق يجب أن يرتبط بوحدة مستعملة واحدة فقط. أنشئ سجلاً مستقلاً لكل جهاز.");
      }
      if (!finalImages.some((img) =>
        img.source_type === "merchant_uploaded_photo" && img.url.startsWith("/media/")
      )) {
        throw new Error("الفحص الموثق يتطلب صورة حقيقية مرفوعة للجهاز الفعلي.");
      }
    }
    const updates: Partial<typeof products.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (patch.sku) updates.sku = patch.sku.trim().toUpperCase();
    if (patch.brand) updates.brand = patch.brand.trim();
    if (patch.commercial_name)
      updates.commercialName = patch.commercial_name.trim();
    if (patch.color) updates.color = patch.color.trim();
    if (patch.name) {
      updates.nameAr = patch.name.ar.trim();
      updates.nameFr = patch.name.fr.trim();
      updates.nameEn = patch.name.en.trim();
    }
    if (typeof patch.price_dzd === "number" && patch.price_dzd > 0) {
      updates.priceDzd = Math.floor(patch.price_dzd);
    }
    if (patch.condition) {
      updates.condition = patch.condition;
    }
    if (typeof patch.stock_quantity === "number" && patch.stock_quantity >= 0) {
      const nextStock = Math.floor(patch.stock_quantity);
      updates.stockQuantity = nextStock;
      if (nextStock === 0 && !patch.availability) {
        updates.availability = "sold";
      } else if (nextStock > 0 && !patch.availability) {
        updates.availability = "available";
      }
    }
    if (patch.availability) {
      updates.availability = patch.availability;
    }
    if (
      typeof patch.battery_health_percent === "number" &&
      patch.battery_health_percent >= 0 &&
      patch.battery_health_percent <= 100
    ) {
      updates.batteryHealthPercent = Math.floor(patch.battery_health_percent);
    }
    if (Array.isArray(patch.images)) {
      updates.images = patch.images.map((img, idx) => {
        const url = String(img.url || "").trim();
        const isSeededStudio = url.startsWith("/images/products/");
        return {
          url,
          webp_url:
            img.webp_url ||
            (isSeededStudio && url.endsWith(".jpg")
              ? url.replace(/\.jpg$/, ".webp")
              : undefined),
          source_type:
            img.source_type ||
            (isSeededStudio
              ? "illustrative_studio_render"
              : "merchant_uploaded_photo"),
          alt_ar: img.alt_ar || "",
          alt_fr: img.alt_fr || "",
          alt_en: img.alt_en || "",
          sort_order: typeof img.sort_order === "number" ? img.sort_order : idx,
        };
      });
    }
    if (patch.specs) {
      updates.specsJson = patch.specs;
      updates.ramGb = String(patch.specs.ram_gb);
      updates.storageGb = patch.specs.storage_gb;
      updates.processor = patch.specs.processor;
      updates.camera = `${patch.specs.camera.mp}MP`;
      updates.batteryMah = patch.specs.battery_mah;
    }
    if (patch.inspection !== undefined) {
      updates.inspectionJson = patch.inspection;
      updates.batteryHealthPercent =
        patch.inspection?.data_status === "merchant_verified"
          ? patch.inspection.battery_health_percent
          : null;
      if (patch.inspection?.data_status !== "merchant_verified") {
        updates.screenCondition = null;
        updates.bodyCondition = null;
        updates.accessories = [];
      }
    }
    if (patch.seller_personal_note) {
      updates.sellerPersonalNoteJson = patch.seller_personal_note;
      updates.descriptionAr = patch.seller_personal_note.ar;
      updates.descriptionFr = patch.seller_personal_note.fr;
      updates.descriptionEn = patch.seller_personal_note.en;
      updates.sellerNote = patch.seller_personal_note.ar;
    }

    const [updated] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return updated ? mapProductRowToDto(updated) : null;
  } catch (error) {
    console.error("Failed to update product:", error);
    throw new Error("Failed to update product.", { cause: error });
  }
}

export async function deleteOrHideProductInDb(id: string): Promise<{
  deleted: boolean;
  hidden: boolean;
}> {
  try {
    await ensureSeeded();
    const existingOrderRefs = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.productId, id))
      .limit(1);

    if (existingOrderRefs.length > 0) {
      // Preserve order history integrity by soft-hiding the product
      await db
        .update(products)
        .set({ availability: "hidden", updatedAt: new Date() })
        .where(eq(products.id, id));
      return { deleted: false, hidden: true };
    }

    await db.delete(products).where(eq(products.id, id));
    return { deleted: true, hidden: false };
  } catch (error) {
    console.error("Failed to delete/hide product:", error);
    throw new Error("Failed to remove product.", { cause: error });
  }
}

export async function listWilayas(includeInactive = true) {
  try {
    await ensureSeeded();
    const rows = includeInactive
      ? await db
          .select()
          .from(wilayasShipping)
          .orderBy(asc(wilayasShipping.code))
      : await db
          .select()
          .from(wilayasShipping)
          .where(eq(wilayasShipping.isActive, true))
          .orderBy(asc(wilayasShipping.code));

    return rows.map((r) => ({
      code: r.code,
      name_ar: r.nameAr,
      name_fr: r.nameFr,
      name_en: r.nameEn,
      home_delivery_price: r.homeDeliveryPrice,
      stop_desk_price: r.stopDeskPrice,
      is_active: r.isActive,
      parent_wilaya_code: r.parentWilayaCode ?? null,
    }));
  } catch (error) {
    console.error("Failed to list wilayas:", error);
    throw new Error("Failed to query shipping wilayas.", { cause: error });
  }
}

export async function getWilayaByCode(code: string) {
  try {
    await ensureSeeded();
    const [r] = await db
      .select()
      .from(wilayasShipping)
      .where(eq(wilayasShipping.code, code));
    if (!r) return null;
    return {
      code: r.code,
      name_ar: r.nameAr,
      name_fr: r.nameFr,
      name_en: r.nameEn,
      home_delivery_price: r.homeDeliveryPrice,
      stop_desk_price: r.stopDeskPrice,
      is_active: r.isActive,
      parent_wilaya_code: r.parentWilayaCode ?? null,
    };
  } catch (error) {
    console.error("Failed to fetch wilaya:", error);
    throw new Error("Failed to query wilaya.", { cause: error });
  }
}

export async function updateWilayaInDb(
  code: string,
  patch: {
    home_delivery_price?: number;
    stop_desk_price?: number;
    is_active?: boolean;
  }
) {
  try {
    await ensureSeeded();
    const updates: Partial<typeof wilayasShipping.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (
      typeof patch.home_delivery_price === "number" &&
      patch.home_delivery_price >= 0
    ) {
      updates.homeDeliveryPrice = Math.floor(patch.home_delivery_price);
    }
    if (
      typeof patch.stop_desk_price === "number" &&
      patch.stop_desk_price >= 0
    ) {
      updates.stopDeskPrice = Math.floor(patch.stop_desk_price);
    }
    if (typeof patch.is_active === "boolean") {
      updates.isActive = patch.is_active;
    }

    const [r] = await db
      .update(wilayasShipping)
      .set(updates)
      .where(eq(wilayasShipping.code, code))
      .returning();
    if (!r) return null;
    return {
      code: r.code,
      name_ar: r.nameAr,
      name_fr: r.nameFr,
      name_en: r.nameEn,
      home_delivery_price: r.homeDeliveryPrice,
      stop_desk_price: r.stopDeskPrice,
      is_active: r.isActive,
      parent_wilaya_code: r.parentWilayaCode ?? null,
    };
  } catch (error) {
    console.error("Failed to update wilaya:", error);
    throw new Error("Failed to update wilaya shipping.", { cause: error });
  }
}

export async function getSettingsFromDb() {
  try {
    await ensureSeeded();
    const [row] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.key, "default"));
    const rawWhatsapp = (row?.whatsapp ?? "").trim();
    return {
      whatsapp: rawWhatsapp === "213555000000" ? "" : rawWhatsapp,
      instagram: row?.instagram ?? "dzphone",
      messenger: row?.messenger ?? "dzphone",
    };
  } catch (error) {
    console.error("Failed to load settings:", error);
    throw new Error("Failed to query store settings.", { cause: error });
  }
}

export async function updateSettingsInDb(input: {
  whatsapp: string;
  instagram: string;
  messenger: string;
}) {
  try {
    await ensureSeeded();
    const [row] = await db
      .insert(storeSettings)
      .values({
        key: "default",
        whatsapp: input.whatsapp.trim(),
        instagram: input.instagram.trim(),
        messenger: input.messenger.trim(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: storeSettings.key,
        set: {
          whatsapp: input.whatsapp.trim(),
          instagram: input.instagram.trim(),
          messenger: input.messenger.trim(),
          updatedAt: new Date(),
        },
      })
      .returning();
    return {
      whatsapp: row.whatsapp,
      instagram: row.instagram,
      messenger: row.messenger,
    };
  } catch (error) {
    console.error("Failed to update settings:", error);
    throw new Error("Failed to update settings.", { cause: error });
  }
}

export async function createOrderTransaction(input: {
  customer_full_name: string;
  customer_phone: string;
  wilaya_code: string;
  commune: string;
  delivery_address?: string;
  shipping_method: ShippingMethod;
  purchase_method: "direct_checkout" | "in_site_chat" | "social_media";
  chat_session_id?: string | null;
  items: { product_id: string; quantity: number }[];
  customer_note?: string;
}) {
  try {
    await ensureSeeded();
    const phone = normalizeAlgerianMobile(input.customer_phone);

    return await db.transaction(async (tx) => {
      const [wilaya] = await tx
        .select()
        .from(wilayasShipping)
        .where(eq(wilayasShipping.code, input.wilaya_code));

      if (!wilaya || !wilaya.isActive) {
        throw new Error("الولاية المختارة غير متاحة للتوصيل حالياً.");
      }

      // Aggregate duplicate product rows in the same order request
      const aggregatedItemsMap = new Map<string, number>();
      for (const item of input.items) {
        const qty = Math.max(1, Math.floor(item.quantity));
        aggregatedItemsMap.set(
          item.product_id,
          (aggregatedItemsMap.get(item.product_id) ?? 0) + qty
        );
      }

      const productIds = Array.from(aggregatedItemsMap.keys()).sort();
      // Acquire row-level FOR UPDATE lock on the ordered products so concurrent orders cannot oversell stock
      const dbProducts = await tx
        .select()
        .from(products)
        .where(inArray(products.id, productIds))
        .orderBy(asc(products.id))
        .for("update");

      const resolvedItems: {
        productId: string;
        nameSnapshot: string;
        unitPriceDzd: number;
        quantity: number;
        lineTotalDzd: number;
        nextStock: number;
      }[] = [];

      for (const [productId, qty] of aggregatedItemsMap.entries()) {
        const prod = dbProducts.find((p) => p.id === productId);
        if (!prod || prod.availability !== "available") {
          throw new Error(
            `المنتج المطلوب (${prod?.nameAr || productId}) غير متاح حالياً.`
          );
        }
        if (prod.stockQuantity < qty) {
          throw new Error(
            `الكمية المطلوبة من ${prod.nameAr} غير متوفرة في المخزون (المتبقي: ${prod.stockQuantity}).`
          );
        }
        const nextStock = prod.stockQuantity - qty;
        resolvedItems.push({
          productId: prod.id,
          nameSnapshot: prod.nameAr,
          unitPriceDzd: prod.priceDzd,
          quantity: qty,
          lineTotalDzd: prod.priceDzd * qty,
          nextStock,
        });
      }

      // Only apply a seller discount if linked to an unlocked chat session
      let verifiedDiscountDzd = 0;
      let validChatSessionId: string | null = null;
      if (input.chat_session_id) {
        const [session] = await tx
          .select()
          .from(chatSessions)
          .where(eq(chatSessions.id, input.chat_session_id));
        if (session) {
          validChatSessionId = session.id;
          if (session.checkoutUnlocked && session.checkoutDiscountDzd > 0) {
            verifiedDiscountDzd = session.checkoutDiscountDzd;
          }
        }
      }

      const totals = computeOrderTotals({
        items: resolvedItems.map((i) => ({
          unitPriceDzd: i.unitPriceDzd,
          quantity: i.quantity,
        })),
        wilaya: {
          code: wilaya.code,
          isActive: wilaya.isActive,
          homeDeliveryPrice: wilaya.homeDeliveryPrice,
          stopDeskPrice: wilaya.stopDeskPrice,
        },
        shippingMethod: input.shipping_method,
        discountDzd: verifiedDiscountDzd,
      });

      // Prevent accidental duplicate double-click order submission within 15 seconds for same phone & total
      const duplicateCutoff = new Date(Date.now() - 15_000);
      const recentDuplicates = await tx
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.customerPhone, phone.national),
            eq(orders.wilayaCode, wilaya.code),
            eq(orders.totalPriceDzd, totals.totalPriceDzd),
            ne(orders.status, "cancelled"),
            gt(orders.createdAt, duplicateCutoff)
          )
        )
        .limit(1);

      if (recentDuplicates.length > 0) {
        throw new Error(
          `تم تسجيل طلب مطابق (${recentDuplicates[0].orderNumber}) برقم هاتفك قبل لحظات. سيتصل بك البائع لتأكيده.`
        );
      }

      // Decrement stock atomically inside the transaction
      for (const item of resolvedItems) {
        await tx
          .update(products)
          .set({
            stockQuantity: item.nextStock,
            availability: item.nextStock === 0 ? "sold" : "available",
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));
      }

      // UUID primary key + 64-bit random suffix avoids the previous 24-bit collision space.
      const orderId = crypto.randomUUID();
      const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const orderNumber = `DZ-${dateCode}-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;

      const [createdOrder] = await tx
        .insert(orders)
        .values({
          id: orderId,
          orderNumber,
          customerFullName: input.customer_full_name.trim(),
          customerPhone: phone.national,
          customerPhoneE164: phone.e164,
          wilayaCode: wilaya.code,
          commune: input.commune.trim(),
          deliveryAddress: input.delivery_address?.trim() || null,
          shippingMethod: input.shipping_method,
          purchaseMethod: input.purchase_method,
          itemsSubtotalDzd: totals.itemsSubtotalDzd,
          discountDzd: totals.discountDzd,
          shippingPriceDzd: totals.shippingPriceDzd,
          totalPriceDzd: totals.totalPriceDzd,
          status: "pending_phone_confirmation",
          chatSessionId: validChatSessionId,
          customerNote: input.customer_note?.trim() || null,
        })
        .returning();

      for (const item of resolvedItems) {
        await tx.insert(orderItems).values({
          orderId: createdOrder.id,
          productId: item.productId,
          productNameSnapshot: item.nameSnapshot,
          unitPriceDzdSnapshot: item.unitPriceDzd,
          quantity: item.quantity,
          lineTotalDzd: item.lineTotalDzd,
        });
      }

      await tx.insert(notificationOutbox).values({
        eventType: "order.created",
        dedupeKey: `order-created:${createdOrder.id}`,
        payload: {
          orderId: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          customerFullName: createdOrder.customerFullName,
          customerPhoneE164: createdOrder.customerPhoneE164,
          wilayaCode: wilaya.code,
          wilayaName: wilaya.nameAr,
          commune: createdOrder.commune,
          shippingMethod: createdOrder.shippingMethod,
          items: resolvedItems.map((i) => ({
            name: i.nameSnapshot,
            quantity: i.quantity,
            lineTotalDzd: i.lineTotalDzd,
          })),
          itemsSubtotalDzd: createdOrder.itemsSubtotalDzd,
          discountDzd: createdOrder.discountDzd,
          shippingPriceDzd: createdOrder.shippingPriceDzd,
          totalPriceDzd: createdOrder.totalPriceDzd,
        },
        status: "pending",
      });

      return {
        id: createdOrder.id,
        order_number: createdOrder.orderNumber,
        created_at: createdOrder.createdAt.toISOString(),
        customer_full_name: createdOrder.customerFullName,
        customer_phone: createdOrder.customerPhone,
        wilaya_code: createdOrder.wilayaCode,
        commune: createdOrder.commune,
        delivery_address: createdOrder.deliveryAddress ?? "",
        shipping_method: createdOrder.shippingMethod,
        purchase_method: createdOrder.purchaseMethod,
        chat_session_id: createdOrder.chatSessionId,
        customer_note: createdOrder.customerNote ?? undefined,
        items: resolvedItems.map((i) => ({
          product_id: i.productId,
          name: i.nameSnapshot,
          price_dzd: i.unitPriceDzd,
          quantity: i.quantity,
        })),
        items_subtotal_dzd: createdOrder.itemsSubtotalDzd,
        discount_dzd: createdOrder.discountDzd,
        shipping_price_dzd: createdOrder.shippingPriceDzd,
        total_price_dzd: createdOrder.totalPriceDzd,
        status: createdOrder.status,
      };
    });
  } catch (error: any) {
    console.error("Order creation failed:", error);
    throw new Error(error?.message || "تعذر إنشاء الطلب.", { cause: error });
  }
}

export async function listOrdersFromDb() {
  try {
    await ensureSeeded();
    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));
    if (!allOrders.length) return [];

    const allItems = await db.select().from(orderItems);
    return allOrders.map((o) => ({
      id: o.id,
      order_number: o.orderNumber,
      created_at: o.createdAt.toISOString(),
      confirmed_at: o.confirmedAt ? o.confirmedAt.toISOString() : null,
      shipped_at: o.shippedAt ? o.shippedAt.toISOString() : null,
      delivered_at: o.deliveredAt ? o.deliveredAt.toISOString() : null,
      cancelled_at: o.cancelledAt ? o.cancelledAt.toISOString() : null,
      customer_full_name: o.customerFullName,
      customer_phone: o.customerPhone,
      wilaya_code: o.wilayaCode,
      commune: o.commune,
      delivery_address: o.deliveryAddress ?? "",
      shipping_method: o.shippingMethod,
      purchase_method: o.purchaseMethod,
      chat_session_id: o.chatSessionId,
      customer_note: o.customerNote ?? undefined,
      admin_note: o.adminNote ?? undefined,
      items: allItems
        .filter((i) => i.orderId === o.id)
        .map((i) => ({
          product_id: i.productId,
          name: i.productNameSnapshot,
          price_dzd: i.unitPriceDzdSnapshot,
          quantity: i.quantity,
        })),
      items_subtotal_dzd: o.itemsSubtotalDzd,
      discount_dzd: o.discountDzd,
      shipping_price_dzd: o.shippingPriceDzd,
      total_price_dzd: o.totalPriceDzd,
      status: o.status,
    }));
  } catch (error) {
    console.error("Failed to list orders:", error);
    throw new Error("Failed to query orders.", { cause: error });
  }
}

export async function trackOrderInDb(
  orderNumber: string,
  customerPhone: string
): Promise<{ status: OrderStatus; created_at: string } | null> {
  await ensureSeeded();
  const normalizedOrderNum = orderNumber.trim().toUpperCase();
  if (!normalizedOrderNum) return null;

  let phoneNational: string;
  try {
    phoneNational = normalizeAlgerianMobile(customerPhone).national;
  } catch {
    return null;
  }

  const [matched] = await db
    .select({
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.orderNumber, normalizedOrderNum),
        eq(orders.customerPhone, phoneNational)
      )
    );

  if (!matched) return null;

  return {
    status: matched.status,
    created_at: matched.createdAt.toISOString(),
  };
}

export async function transitionOrderStatusInDb(
  orderId: string,
  nextStatus: OrderStatus,
  adminNote?: string
) {
  try {
    await ensureSeeded();
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .for("update");
      if (!existing) {
        throw new Error("الطلب غير موجود.");
      }
      if (!canTransitionOrderStatus(existing.status, nextStatus)) {
        throw new Error(
          `لا يمكن تغيير الحالة من ${existing.status} إلى ${nextStatus}.`
        );
      }

      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      // If transitioning to cancelled, restore stock quantities
      if (nextStatus === "cancelled" && existing.status !== "cancelled") {
        const productIds = [...new Set(items.map((item) => item.productId))].sort();
        const lockedProducts = productIds.length
          ? await tx
              .select()
              .from(products)
              .where(inArray(products.id, productIds))
              .orderBy(asc(products.id))
              .for("update")
          : [];
        const productById = new Map(lockedProducts.map((product) => [product.id, product]));
        for (const item of items) {
          const prod = productById.get(item.productId);
          if (prod) {
            const restoredStock = prod.stockQuantity + item.quantity;
            await tx
              .update(products)
              .set({
                stockQuantity: restoredStock,
                availability:
                  prod.availability === "sold" ? "available" : prod.availability,
                updatedAt: new Date(),
              })
              .where(eq(products.id, prod.id));
            // Keep the map in sync in case an order contains multiple lines for one product.
            prod.stockQuantity = restoredStock;
          }
        }
      }

      const now = new Date();
      const updates: Partial<typeof orders.$inferInsert> = {
        status: nextStatus,
        updatedAt: now,
      };
      if (typeof adminNote === "string") {
        updates.adminNote = adminNote.trim() || null;
      }
      if (nextStatus === "confirmed_by_call") updates.confirmedAt = now;
      if (nextStatus === "shipped") updates.shippedAt = now;
      if (nextStatus === "delivered") updates.deliveredAt = now;
      if (nextStatus === "cancelled") updates.cancelledAt = now;

      const [updated] = await tx
        .update(orders)
        .set(updates)
        .where(eq(orders.id, orderId))
        .returning();

      return {
        id: updated.id,
        order_number: updated.orderNumber,
        created_at: updated.createdAt.toISOString(),
        confirmed_at: updated.confirmedAt
          ? updated.confirmedAt.toISOString()
          : null,
        shipped_at: updated.shippedAt ? updated.shippedAt.toISOString() : null,
        delivered_at: updated.deliveredAt
          ? updated.deliveredAt.toISOString()
          : null,
        cancelled_at: updated.cancelledAt
          ? updated.cancelledAt.toISOString()
          : null,
        customer_full_name: updated.customerFullName,
        customer_phone: updated.customerPhone,
        wilaya_code: updated.wilayaCode,
        commune: updated.commune,
        delivery_address: updated.deliveryAddress ?? "",
        shipping_method: updated.shippingMethod,
        purchase_method: updated.purchaseMethod,
        chat_session_id: updated.chatSessionId,
        customer_note: updated.customerNote ?? undefined,
        admin_note: updated.adminNote ?? undefined,
        items: items.map((i) => ({
          product_id: i.productId,
          name: i.productNameSnapshot,
          price_dzd: i.unitPriceDzdSnapshot,
          quantity: i.quantity,
        })),
        items_subtotal_dzd: updated.itemsSubtotalDzd,
        discount_dzd: updated.discountDzd,
        shipping_price_dzd: updated.shippingPriceDzd,
        total_price_dzd: updated.totalPriceDzd,
        status: updated.status,
      };
    });
  } catch (error: any) {
    console.error("Order status transition failed:", error);
    throw new Error(error?.message || "Failed to update order status.", {
      cause: error,
    });
  }
}

function hashVisitorToken(visitorToken: string, productId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${visitorToken}:${productId}`)
    .digest("hex");
}

export async function formatChatSessionDto(sessionId: string) {
  const [ses] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId));
  if (!ses) return null;
  const msgs = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));

  return {
    id: ses.id,
    product_id: ses.productId ?? "",
    locale: (ses.locale as "ar" | "fr" | "en") || "ar",
    status: ses.status,
    needs_human_agent: ses.needsHumanAgent,
    checkout_unlocked: ses.checkoutUnlocked,
    checkout_discount_dzd: ses.checkoutDiscountDzd,
    messages: msgs.map((m) => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      created_at: m.createdAt.toISOString(),
    })),
  };
}

export async function getChatSessionForVisitorInDb(
  sessionId: string,
  visitorToken: string | undefined | null
) {
  const trimmedToken = typeof visitorToken === "string" ? visitorToken.trim() : "";
  if (!trimmedToken) return null;

  const [ses] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId));
  if (!ses) return null;

  const expectedHash = hashVisitorToken(trimmedToken, ses.productId ?? "");
  const a = Buffer.from(expectedHash, "utf8");
  const b = Buffer.from(ses.visitorTokenHash, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  return formatChatSessionDto(sessionId);
}

export async function getOrCreateChatSessionInDb(input: {
  visitorToken: string;
  productId: string;
  locale: "ar" | "fr" | "en";
}) {
  try {
    await ensureSeeded();
    // Chat sessions are public customer entry points: do not let clients bind a
    // conversation to hidden, draft, or nonexistent products.
    const publicProduct = await getPublicProductById(input.productId);
    if (!publicProduct) {
      throw new Error("المنتج غير متاح للمحادثة حالياً.");
    }

    const tokenHash = hashVisitorToken(input.visitorToken, input.productId);
    const [existing] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.visitorTokenHash, tokenHash));

    if (existing && existing.status !== "closed") {
      if (existing.locale !== input.locale) {
        await db
          .update(chatSessions)
          .set({ locale: input.locale, updatedAt: new Date() })
          .where(eq(chatSessions.id, existing.id));
      }
      return (await formatChatSessionDto(existing.id))!;
    }

    const sessionId = `chat-${crypto.randomBytes(16).toString("hex")}`;
    await db
      .insert(chatSessions)
      .values({
        id: sessionId,
        visitorTokenHash: tokenHash,
        productId: input.productId,
        locale: input.locale,
        status: "open",
        needsHumanAgent: false,
        checkoutUnlocked: false,
        checkoutDiscountDzd: 0,
      })
      .onConflictDoUpdate({
        target: chatSessions.visitorTokenHash,
        set: {
          locale: input.locale,
          updatedAt: new Date(),
        },
      });

    const [created] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.visitorTokenHash, tokenHash));

    return (await formatChatSessionDto(created.id))!;
  } catch (error) {
    console.error("Failed to create/get chat session:", error);
    throw new Error("Failed to initialize chat session.", { cause: error });
  }
}

export async function appendChatMessageInDb(input: {
  sessionId: string;
  sender: "customer" | "assistant" | "human_agent" | "system";
  content: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await ensureSeeded();
    const msgId = `msg-${crypto.randomBytes(8).toString("hex")}`;
    await db.insert(chatMessages).values({
      id: msgId,
      sessionId: input.sessionId,
      sender: input.sender,
      content: input.content,
      metadata: input.metadata ?? {},
    });
    await db
      .update(chatSessions)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(chatSessions.id, input.sessionId));
  } catch (error) {
    console.error("Failed to append chat message:", error);
    throw new Error("Failed to save chat message.", { cause: error });
  }
}

export async function requestHumanAgentInDb(input: {
  sessionId: string;
  reason: string;
  preferredLanguage: "ar" | "fr" | "en";
}) {
  try {
    await ensureSeeded();
    return await db.transaction(async (tx) => {
      const [session] = await tx
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.id, input.sessionId));

      if (!session) throw new Error("Chat session not found");
      if (session.needsHumanAgent) {
        return { escalated: true, alreadyEscalated: true };
      }

      const nextRequestCount = session.humanRequestCount + 1;
      await tx
        .update(chatSessions)
        .set({
          needsHumanAgent: true,
          status: "waiting_for_human",
          humanRequestCount: nextRequestCount,
          updatedAt: new Date(),
        })
        .where(eq(chatSessions.id, session.id));

      let productName = "هاتف ذكي";
      if (session.productId) {
        const [prod] = await tx
          .select()
          .from(products)
          .where(eq(products.id, session.productId));
        if (prod) productName = prod.nameAr;
      }

      await tx.insert(notificationOutbox).values({
        eventType: "chat.human_requested",
        dedupeKey: `human:${session.id}:${nextRequestCount}`,
        payload: {
          sessionId: session.id,
          productName,
          reason: input.reason.slice(0, 500),
          preferredLanguage: input.preferredLanguage,
        },
        status: "pending",
      });

      return { escalated: true, alreadyEscalated: false };
    });
  } catch (error) {
    console.error("Failed to escalate chat session:", error);
    throw new Error("Failed to request human agent.", { cause: error });
  }
}

export async function unlockCheckoutInDb(
  sessionId: string,
  discountDzd = 0
): Promise<void> {
  await ensureSeeded();
  if (!Number.isFinite(discountDzd) || discountDzd < 0) {
    throw new Error("قيمة الخصم يجب أن تكون صفراً أو أكبر.");
  }
  const safeDiscount = Math.floor(discountDzd);
  const [ses] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId));
  if (!ses) {
    throw new Error("جلسة المحادثة غير موجودة.");
  }
  if (ses.productId) {
    const [prod] = await db
      .select()
      .from(products)
      .where(eq(products.id, ses.productId));
    if (prod && safeDiscount > prod.priceDzd) {
      throw new Error(
        `قيمة الخصم (${safeDiscount} دج) لا يمكن أن تتجاوز سعر الهاتف (${prod.priceDzd} دج).`
      );
    }
  }
  await db
    .update(chatSessions)
    .set({
      checkoutUnlocked: true,
      checkoutDiscountDzd: safeDiscount,
      updatedAt: new Date(),
    })
    .where(eq(chatSessions.id, sessionId));
}

export async function listAllChatSessionsFromDb() {
  try {
    await ensureSeeded();
    const sessions = await db
      .select()
      .from(chatSessions)
      .orderBy(desc(chatSessions.lastMessageAt));
    const results = [];
    for (const s of sessions) {
      const dto = await formatChatSessionDto(s.id);
      if (dto) results.push(dto);
    }
    return results;
  } catch (error) {
    console.error("Failed to list chat sessions:", error);
    throw new Error("Failed to query chat sessions.", { cause: error });
  }
}

export async function listOutboxEventsFromDb() {
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(notificationOutbox)
      .orderBy(desc(notificationOutbox.createdAt))
      .limit(40);
    return rows.map((r) => ({
      id: r.id,
      event_type: r.eventType,
      status: r.status,
      attempts: r.attempts,
      created_at: r.createdAt.toISOString(),
      sent_at: r.sentAt ? r.sentAt.toISOString() : null,
      last_error: r.lastError,
    }));
  } catch (error) {
    console.error("Failed to list outbox events:", error);
    throw new Error("Failed to query outbox events.", { cause: error });
  }
}
