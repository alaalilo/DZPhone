import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  numeric,
  jsonb,
  timestamp,
  serial,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export type ProductImageSourceType =
  | "illustrative_studio_render"
  | "merchant_uploaded_photo";

export type ProductImage = {
  url: string;
  webp_url?: string;
  source_type?: ProductImageSourceType;
  alt_ar?: string;
  alt_fr?: string;
  alt_en?: string;
  sort_order: number;
};

export type ProductSpecsJson = {
  display: { size: number; tech: string; res: string; hz: number };
  processor: string;
  ram_gb: number;
  storage_gb: number;
  camera: { mp: number; aperture?: string; ois: boolean };
  battery_mah: number;
  charging_w?: number;
};

export type ProductInspectionDataStatus =
  | "illustrative_template"
  | "merchant_verified";

export type ProductInspectionJson = {
  data_status?: ProductInspectionDataStatus;
  battery_health_percent: number;
  body_score_out_of_10: number;
  body_description: { ar: string; fr: string; en: string };
  accessories: [
    "original_box" | "cable" | "s_pen" | "power_adapter",
    boolean,
  ][];
};

export const productConditionEnum = pgEnum("product_condition", [
  "new_sealed",
  "used_like_new",
]);

export const productAvailabilityEnum = pgEnum("product_availability", [
  "draft",
  "available",
  "reserved",
  "sold",
  "hidden",
]);

export const shippingMethodEnum = pgEnum("shipping_method", [
  "home_delivery",
  "stop_desk",
]);

export const purchaseMethodEnum = pgEnum("purchase_method", [
  "direct_checkout",
  "in_site_chat",
  "social_media",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending_phone_confirmation",
  "confirmed_by_call",
  "shipped",
  "delivered",
  "cancelled",
]);

export const chatSenderEnum = pgEnum("chat_sender", [
  "customer",
  "assistant",
  "human_agent",
  "system",
]);

export const chatStatusEnum = pgEnum("chat_status", [
  "open",
  "waiting_for_human",
  "closed",
]);

export const outboxStatusEnum = pgEnum("outbox_status", [
  "pending",
  "processing",
  "sent",
  "failed",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  role: varchar("role", { length: 32 }).notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    sku: varchar("sku", { length: 64 }).notNull(),
    brand: varchar("brand", { length: 80 }).notNull().default("Apple"),
    commercialName: varchar("commercial_name", { length: 180 }).notNull().default(""),
    color: varchar("color", { length: 32 }).notNull().default("#0F172A"),

    nameAr: varchar("name_ar", { length: 180 }).notNull(),
    nameFr: varchar("name_fr", { length: 180 }).notNull(),
    nameEn: varchar("name_en", { length: 180 }).notNull(),
    descriptionAr: text("description_ar").notNull().default(""),
    descriptionFr: text("description_fr").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),

    priceDzd: integer("price_dzd").notNull(),
    condition: productConditionEnum("condition").notNull(),

    batteryHealthPercent: integer("battery_health_percent"),
    screenCondition: varchar("screen_condition", { length: 40 }),
    bodyCondition: varchar("body_condition", { length: 40 }),
    accessories: text("accessories")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    sellerNote: text("seller_note"),

    ramGb: numeric("ram_gb", { precision: 6, scale: 2 }),
    storageGb: integer("storage_gb"),
    processor: varchar("processor", { length: 160 }),
    camera: varchar("camera", { length: 160 }),
    batteryMah: integer("battery_mah"),

    specsJson: jsonb("specs_json").$type<ProductSpecsJson>(),
    inspectionJson: jsonb("inspection_json").$type<ProductInspectionJson | null>(),
    sellerPersonalNoteJson: jsonb("seller_personal_note_json").$type<{
      ar: string;
      fr: string;
      en: string;
    }>(),

    images: jsonb("images")
      .$type<ProductImage[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    availability: productAvailabilityEnum("availability")
      .notNull()
      .default("available"),
    stockQuantity: integer("stock_quantity").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("products_sku_uq").on(t.sku),
    index("products_availability_idx").on(t.availability),
    index("products_condition_idx").on(t.condition),
    check("products_price_positive_ck", sql`${t.priceDzd} > 0`),
    check("products_stock_nonnegative_ck", sql`${t.stockQuantity} >= 0`),
    check(
      "products_battery_health_ck",
      sql`${t.batteryHealthPercent} IS NULL OR (${t.batteryHealthPercent} >= 0 AND ${t.batteryHealthPercent} <= 100)`
    ),
    check(
      "products_storage_positive_ck",
      sql`${t.storageGb} IS NULL OR ${t.storageGb} > 0`
    ),
    check(
      "products_battery_mah_positive_ck",
      sql`${t.batteryMah} IS NULL OR ${t.batteryMah} > 0`
    ),
  ]
);

export const wilayasShipping = pgTable(
  "wilayas_shipping",
  {
    code: varchar("code", { length: 2 }).primaryKey(),
    nameAr: varchar("name_ar", { length: 100 }).notNull(),
    nameFr: varchar("name_fr", { length: 100 }).notNull(),
    nameEn: varchar("name_en", { length: 100 }).notNull(),
    homeDeliveryPrice: integer("home_delivery_price").notNull().default(800),
    stopDeskPrice: integer("stop_desk_price").notNull().default(500),
    isActive: boolean("is_active").notNull().default(true),
    parentWilayaCode: varchar("parent_wilaya_code", { length: 2 }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("wilayas_shipping_active_idx").on(t.isActive),
    check(
      "wilayas_code_format_ck",
      sql`${t.code} ~ '^[0-6][0-9]$' AND ${t.code} <> '00'`
    ),
    check("wilayas_home_price_nonnegative_ck", sql`${t.homeDeliveryPrice} >= 0`),
    check("wilayas_desk_price_nonnegative_ck", sql`${t.stopDeskPrice} >= 0`),
  ]
);

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    visitorTokenHash: varchar("visitor_token_hash", { length: 128 }).notNull(),
    productId: varchar("product_id", { length: 128 }).references(
      () => products.id,
      { onDelete: "set null" }
    ),
    locale: varchar("locale", { length: 5 }).notNull().default("ar"),
    status: chatStatusEnum("status").notNull().default("open"),
    needsHumanAgent: boolean("needs_human_agent").notNull().default(false),
    checkoutUnlocked: boolean("checkout_unlocked").notNull().default(false),
    checkoutDiscountDzd: integer("checkout_discount_dzd").notNull().default(0),
    humanRequestCount: integer("human_request_count").notNull().default(0),
    assignedAgentId: varchar("assigned_agent_id", { length: 128 }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("chat_sessions_visitor_token_hash_uq").on(t.visitorTokenHash),
    index("chat_sessions_human_queue_idx").on(
      t.needsHumanAgent,
      t.status,
      t.lastMessageAt
    ),
  ]
);

export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    orderNumber: varchar("order_number", { length: 32 }).notNull(),
    customerFullName: varchar("customer_full_name", { length: 160 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 10 }).notNull(),
    customerPhoneE164: varchar("customer_phone_e164", { length: 16 }).notNull(),
    wilayaCode: varchar("wilaya_code", { length: 2 })
      .notNull()
      .references(() => wilayasShipping.code, { onDelete: "restrict" }),
    commune: varchar("commune", { length: 120 }).notNull(),
    deliveryAddress: text("delivery_address"),
    shippingMethod: shippingMethodEnum("shipping_method").notNull(),
    purchaseMethod: purchaseMethodEnum("purchase_method").notNull(),

    itemsSubtotalDzd: integer("items_subtotal_dzd").notNull(),
    discountDzd: integer("discount_dzd").notNull().default(0),
    shippingPriceDzd: integer("shipping_price_dzd").notNull(),
    totalPriceDzd: integer("total_price_dzd").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("DZD"),

    status: orderStatusEnum("status")
      .notNull()
      .default("pending_phone_confirmation"),
    chatSessionId: varchar("chat_session_id", { length: 64 }).references(
      () => chatSessions.id,
      { onDelete: "set null" }
    ),
    customerNote: text("customer_note"),
    adminNote: text("admin_note"),
    socialMediaSource: varchar("social_media_source", { length: 40 }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_order_number_uq").on(t.orderNumber),
    index("orders_status_created_idx").on(t.status, t.createdAt),
    index("orders_customer_phone_idx").on(t.customerPhone),
    index("orders_chat_session_idx").on(t.chatSessionId),
    check("orders_phone_format_ck", sql`${t.customerPhone} ~ '^0[567][0-9]{8}$'`),
    check(
      "orders_phone_e164_ck",
      sql`${t.customerPhoneE164} ~ '^\\+213[567][0-9]{8}$'`
    ),
    check(
      "orders_amounts_nonnegative_ck",
      sql`${t.itemsSubtotalDzd} >= 0 AND ${t.discountDzd} >= 0 AND ${t.shippingPriceDzd} >= 0 AND ${t.totalPriceDzd} >= 0`
    ),
    check(
      "orders_total_consistency_ck",
      sql`${t.totalPriceDzd} = ${t.itemsSubtotalDzd} - ${t.discountDzd} + ${t.shippingPriceDzd}`
    ),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: varchar("order_id", { length: 64 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 128 })
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    productNameSnapshot: varchar("product_name_snapshot", {
      length: 180,
    }).notNull(),
    unitPriceDzdSnapshot: integer("unit_price_dzd_snapshot").notNull(),
    quantity: integer("quantity").notNull().default(1),
    lineTotalDzd: integer("line_total_dzd").notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_quantity_positive_ck", sql`${t.quantity} > 0`),
    check(
      "order_items_price_nonnegative_ck",
      sql`${t.unitPriceDzdSnapshot} >= 0 AND ${t.lineTotalDzd} >= 0`
    ),
    check(
      "order_items_line_total_ck",
      sql`${t.lineTotalDzd} = ${t.unitPriceDzdSnapshot} * ${t.quantity}`
    ),
  ]
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    sessionId: varchar("session_id", { length: 64 })
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    sender: chatSenderEnum("sender").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("chat_messages_session_created_idx").on(t.sessionId, t.createdAt)]
);

export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: varchar("event_type", { length: 60 }).notNull(),
    dedupeKey: varchar("dedupe_key", { length: 180 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: outboxStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("notification_outbox_dedupe_uq").on(t.dedupeKey),
    index("notification_outbox_pending_idx").on(t.status, t.availableAt),
  ]
);

export const storeSettings = pgTable("store_settings", {
  key: varchar("key", { length: 32 }).primaryKey().default("default"),
  whatsapp: varchar("whatsapp", { length: 64 }).notNull().default(""),
  instagram: varchar("instagram", { length: 120 }).notNull().default("dzphone"),
  messenger: varchar("messenger", { length: 120 }).notNull().default("dzphone"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Relations
export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  wilaya: one(wilayasShipping, {
    fields: [orders.wilayaCode],
    references: [wilayasShipping.code],
  }),
  chatSession: one(chatSessions, {
    fields: [orders.chatSessionId],
    references: [chatSessions.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ many, one }) => ({
  messages: many(chatMessages),
  product: one(products, {
    fields: [chatSessions.productId],
    references: [products.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));
