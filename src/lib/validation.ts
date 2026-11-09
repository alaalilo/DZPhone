import { z } from "zod";

export const OrderCreateSchema = z.object({
  customer_full_name: z.string().trim().min(3).max(160),
  customer_phone: z.string().trim().min(9).max(20),
  wilaya_code: z.string().regex(/^[0-6][0-9]$/),
  commune: z.string().trim().min(2).max(120),
  delivery_address: z.string().max(500).optional(),
  shipping_method: z.enum(["home_delivery", "stop_desk"]),
  purchase_method: z.enum(["direct_checkout", "in_site_chat", "social_media"]),
  chat_session_id: z.string().max(128).nullable().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1).max(120),
        quantity: z.number().int().positive().max(20),
      })
    )
    .min(1),
  customer_note: z.string().max(500).optional(),
});

export const OrderTrackSchema = z.object({
  order_number: z.string().trim().min(4).max(40),
  customer_phone: z.string().trim().min(9).max(20),
});

export const ChatSessionCreateSchema = z.object({
  product_id: z.string().min(1).max(120),
  locale: z.enum(["ar", "fr", "en"]).default("ar"),
});

export const ChatMessageSendSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  intent: z.enum(["request_human"]).optional(),
});

export const AdminSettingsSchema = z.object({
  whatsapp: z
    .string()
    .trim()
    .regex(/^(\d{9,15})?$/, "Invalid WhatsApp number (must be 9-15 digits or empty)"),
  instagram: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._]{1,64}$/, "Invalid Instagram handle"),
  messenger: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._]{1,64}$/, "Invalid Messenger handle"),
});

export const AdminWilayaPatchSchema = z
  .object({
    home_delivery_price: z.number().int().min(0).max(50_000).optional(),
    stop_desk_price: z.number().int().min(0).max(50_000).optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.home_delivery_price !== undefined ||
      d.stop_desk_price !== undefined ||
      d.is_active !== undefined,
    { message: "At least one field must be provided" }
  );

export const AdminOrderStatusPatchSchema = z.object({
  status: z.enum([
    "pending_phone_confirmation",
    "confirmed_by_call",
    "shipped",
    "delivered",
    "cancelled",
  ]),
  admin_note: z.string().max(500).optional(),
});

export const AdminUnlockCheckoutSchema = z.object({
  discount_dzd: z.number().int().min(0).max(2_000_000),
});

const LocalizedTextSchema = z.object({
  ar: z.string().trim().min(1).max(1000),
  fr: z.string().trim().min(1).max(1000),
  en: z.string().trim().min(1).max(1000),
});

const ProductImageSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine(
      (value) =>
        value.startsWith("/images/products/") ||
        value.startsWith("/media/") ||
        /^https:\/\//i.test(value),
      "Image URLs must use an approved local media path or HTTPS."
    ),
  webp_url: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (value) =>
        value === "" ||
        value.startsWith("/images/products/") ||
        value.startsWith("/media/") ||
        /^https:\/\//i.test(value),
      "WebP image URLs must use an approved local media path or HTTPS."
    )
    .optional(),
  source_type: z
    .enum(["illustrative_studio_render", "merchant_uploaded_photo"])
    .optional(),
  alt_ar: z.string().max(300).optional(),
  alt_fr: z.string().max(300).optional(),
  alt_en: z.string().max(300).optional(),
  sort_order: z.number().int().min(0).max(50).default(0),
});

const ProductSpecsSchema = z.object({
  display: z.object({
    size: z.coerce.number().min(3).max(12),
    tech: z.string().trim().min(1).max(80),
    res: z.string().trim().min(1).max(80),
    hz: z.number().int().min(30).max(240),
  }),
  processor: z.string().trim().min(1).max(120),
  ram_gb: z.number().int().min(1).max(64),
  storage_gb: z.number().int().min(8).max(4096),
  camera: z.object({
    mp: z.number().int().min(1).max(400),
    ois: z.boolean().default(true),
    aperture: z.string().max(40).optional(),
  }),
  battery_mah: z.number().int().min(500).max(25000),
  charging_w: z.number().int().min(1).max(300).optional(),
});

const ProductInspectionSchema = z
  .object({
    battery_health_percent: z.number().int().min(1).max(100),
    cycle_count: z.number().int().min(0).max(5000).optional(),
    body_score_out_of_10: z.number().min(1).max(10),
    screen_condition: z
      .enum(["flawless", "micro_scratches", "visible_wear"])
      .optional(),
    chassis_grade: z.enum(["A+", "A", "B+"]).optional(),
    imei_verified_clean: z.boolean().optional(),
    water_seal_intact: z.boolean().optional(),
    RepairHistory: z.enum(["none_original_parts", "serviced"]).optional(),
    warranty_days: z.number().int().min(0).max(1095).optional(),
    inspector_code: z.string().max(80).optional(),
    imei_last4: z.string().max(10).optional(),
    data_status: z
      .enum(["illustrative_template", "merchant_verified"])
      .optional(),
    body_description: LocalizedTextSchema,
    accessories: z.array(
      z.tuple([
        z.enum(["original_box", "cable", "s_pen", "power_adapter"]),
        z.boolean(),
      ])
    ),
  })
  .nullable()
  .optional();

export const AdminProductCreateSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  sku: z.string().trim().min(2).max(80),
  brand: z.string().trim().min(1).max(80),
  commercial_name: z.string().trim().min(1).max(160),
  color: z.string().trim().max(40).optional(),
  name: LocalizedTextSchema,
  price_dzd: z.number().int().min(1000).max(2_000_000),
  condition: z.enum(["new_sealed", "used_like_new"]),
  availability: z
    .enum(["available", "reserved", "sold", "hidden", "draft"])
    .optional(),
  stock_quantity: z.number().int().min(0).max(10_000).optional(),
  images: z.array(ProductImageSchema).max(20).optional(),
  specs: ProductSpecsSchema,
  inspection: ProductInspectionSchema,
  seller_personal_note: LocalizedTextSchema,
});

export const AdminProductPatchSchema = z.object({
  sku: z.string().trim().min(2).max(80).optional(),
  brand: z.string().trim().min(1).max(80).optional(),
  commercial_name: z.string().trim().min(1).max(160).optional(),
  color: z.string().trim().max(40).optional(),
  name: LocalizedTextSchema.optional(),
  price_dzd: z.number().int().min(1000).max(2_000_000).optional(),
  condition: z.enum(["new_sealed", "used_like_new"]).optional(),
  availability: z
    .enum(["available", "reserved", "sold", "hidden", "draft"])
    .optional(),
  stock_quantity: z.number().int().min(0).max(10_000).optional(),
  battery_health_percent: z.number().int().min(1).max(100).optional(),
  images: z.array(ProductImageSchema).max(20).optional(),
  specs: ProductSpecsSchema.optional(),
  inspection: ProductInspectionSchema,
  seller_personal_note: LocalizedTextSchema.optional(),
});
