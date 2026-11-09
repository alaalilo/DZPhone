import test from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import {
  canTransitionOrderStatus,
  computeOrderTotals,
  detectHumanEscalationIntent,
  detectPurchaseIntent,
  mapTelegramActionToStatus,
  normalizeAlgerianMobile,
} from "./domain-rules.ts";
import { PRODUCTS } from "../data/products.ts";
import WILAYAS_SEED from "../data/wilayas-69.seed.json" with { type: "json" };
import {
  type AuthRequest,
  createAdminSessionToken,
  createRateLimiter,
  requireAuth,
  setTokenVerifierForTesting,
  verifyAdminSessionToken,
  verifyPasswordTimingSafe,
  isAdminPasswordConfigured,
  isAdminSessionSecretConfigured,
} from "../middleware/auth.ts";
import {
  createOrderTransaction,
  createProductInDb,
  deleteOrHideProductInDb,
  getChatSessionForVisitorInDb,
  getOrCreateChatSessionInDb,
  getProductById,
  listWilayas,
  transitionOrderStatusInDb,
} from "../db/repository.ts";
import { db, pool } from "../db/index.ts";
import { chatSessions, orders, products } from "../db/schema.ts";
import { handleTelegramWebhookUpdate } from "../modules/notifications/telegram.service.ts";
import {
  AdminProductCreateSchema,
  AdminSettingsSchema,
  AdminUnlockCheckoutSchema,
  AdminWilayaPatchSchema,
} from "./validation.ts";

test.after(async () => {
  await pool.end().catch(() => {});
});

test("normalizeAlgerianMobile validates 05/06/07 Algerian numbers and rejects invalid ones", () => {
  const valid05 = normalizeAlgerianMobile("05 55 12 34 56");
  assert.equal(valid05.national, "0555123456");
  assert.equal(valid05.e164, "+213555123456");

  const validIntl = normalizeAlgerianMobile("+213661987654");
  assert.equal(validIntl.national, "0661987654");
  assert.equal(validIntl.e164, "+213661987654");

  assert.throws(() => normalizeAlgerianMobile("0455123456"));
  assert.throws(() => normalizeAlgerianMobile("05551234"));
});

test("computeOrderTotals calculates Stop Desk, Home Delivery, and Seller Discounts accurately", () => {
  const wilaya16 = {
    code: "16",
    isActive: true,
    homeDeliveryPrice: 600,
    stopDeskPrice: 400,
  };

  const stopDeskTotals = computeOrderTotals({
    items: [{ unitPriceDzd: 179000, quantity: 1 }],
    wilaya: wilaya16,
    shippingMethod: "stop_desk",
    discountDzd: 2000,
  });

  assert.equal(stopDeskTotals.itemsSubtotalDzd, 179000);
  assert.equal(stopDeskTotals.discountDzd, 2000);
  assert.equal(stopDeskTotals.shippingPriceDzd, 400);
  assert.equal(stopDeskTotals.totalPriceDzd, 177400);

  const homeTotals = computeOrderTotals({
    items: [
      { unitPriceDzd: 50000, quantity: 2 },
      { unitPriceDzd: 59000, quantity: 1 },
    ],
    wilaya: wilaya16,
    shippingMethod: "home_delivery",
  });

  assert.equal(homeTotals.itemsSubtotalDzd, 159000);
  assert.equal(homeTotals.shippingPriceDzd, 600);
  assert.equal(homeTotals.totalPriceDzd, 159600);

  assert.throws(() =>
    computeOrderTotals({
      items: [{ unitPriceDzd: 50000, quantity: 1 }],
      wilaya: { ...wilaya16, isActive: false },
      shippingMethod: "stop_desk",
    })
  );
});

test("canTransitionOrderStatus and mapTelegramActionToStatus enforce order state machine", () => {
  assert.equal(
    canTransitionOrderStatus("pending_phone_confirmation", "confirmed_by_call"),
    true
  );
  assert.equal(
    canTransitionOrderStatus("pending_phone_confirmation", "delivered"),
    false
  );
  assert.equal(
    canTransitionOrderStatus("confirmed_by_call", "shipped"),
    true
  );
  assert.equal(canTransitionOrderStatus("shipped", "delivered"), true);
  assert.equal(canTransitionOrderStatus("delivered", "cancelled"), false);

  assert.equal(mapTelegramActionToStatus("cf"), "confirmed_by_call");
  assert.equal(mapTelegramActionToStatus("sh"), "shipped");
  assert.equal(mapTelegramActionToStatus("dl"), "delivered");
  assert.equal(mapTelegramActionToStatus("cx"), "cancelled");
  assert.equal(mapTelegramActionToStatus("unknown"), null);
});

test("detectHumanEscalationIntent and detectPurchaseIntent classify multilingual customer messages", () => {
  assert.equal(detectHumanEscalationIntent("خويا تنقصلي شوية في السعر؟"), true);
  assert.equal(detectHumanEscalationIntent("Quel est votre dernier prix ?"), true);
  assert.equal(detectHumanEscalationIntent("Can I get a discount?"), true);
  assert.equal(detectHumanEscalationIntent("كم سعة البطارية؟"), false);

  assert.equal(detectPurchaseIntent("نحب نشري هذا الهاتف"), true);
  assert.equal(detectPurchaseIntent("Je veux l'acheter maintenant"), true);
  assert.equal(detectPurchaseIntent("I want to buy this phone"), true);
});

test("Catalog products contain honest image provenance, WebP URLs, and illustrative_template status for seeded used phones", () => {
  assert.equal(PRODUCTS.length, 6);
  for (const p of PRODUCTS) {
    assert.ok(p.id.length > 3);
    assert.ok(p.sku.length > 3);
    assert.ok(p.price_dzd > 0);
    assert.ok(p.name.ar && p.name.fr && p.name.en);
    assert.ok(
      Array.isArray(p.images) && p.images.length >= 1,
      `Product ${p.id} must have at least 1 image`
    );
    assert.equal(p.images![0].source_type, "illustrative_studio_render");
    assert.ok(
      p.images![0].webp_url?.endsWith(".webp"),
      `Product ${p.id} must have WebP optimization URL`
    );
    if (p.condition === "used_like_new") {
      assert.equal(
        p.inspection?.data_status,
        "illustrative_template",
        `Used product ${p.id} must default to illustrative_template until merchant verified`
      );
    }
  }
});

test("69 Algerian Wilayas seed data and PostgreSQL sync validate codes 01..69 and parent wilayas for 59..69", async () => {
  assert.equal(WILAYAS_SEED.length, 69);
  const dbWilayas = await listWilayas(true);
  assert.equal(dbWilayas.length, 69);

  const w59 = dbWilayas.find((w) => w.code === "59");
  const w68 = dbWilayas.find((w) => w.code === "68");
  const w69 = dbWilayas.find((w) => w.code === "69");

  assert.ok(w59, "Wilaya 59 (Aflou) must exist in PostgreSQL");
  assert.equal(w59.name_ar, "أفلو");
  assert.equal(w59.parent_wilaya_code, "03");

  assert.ok(w68, "Wilaya 68 (Bou Saâda) must exist in PostgreSQL");
  assert.equal(w68.name_ar, "بوسعادة");
  assert.equal(w68.parent_wilaya_code, "28");

  assert.ok(w69, "Wilaya 69 (El Abiodh Sidi Cheikh) must exist in PostgreSQL");
  assert.equal(w69.name_ar, "الأبيض سيدي الشيخ");
  assert.equal(w69.parent_wilaya_code, "32");
});

test("PostgreSQL Concurrency, Stock Locking (FOR UPDATE), Duplicate Order Prevention & Cancellation Restoration", async () => {
  const testProdId = "test-concurrency-phone-unit";
  const createdOrderIds: string[] = [];

  try {
    // Cleanup any leftover test rows first
    await db.delete(products).where(eq(products.id, testProdId)).catch(() => {});

    // 1. Create a test product with stock_quantity = 1
    await createProductInDb({
      id: testProdId,
      sku: "TEST-CONC-001",
      brand: "Apple",
      commercial_name: "Concurrency Test Phone",
      name: {
        ar: "هاتف اختبار التزامن",
        fr: "Téléphone Test Concurrence",
        en: "Concurrency Test Phone",
      },
      condition: "new_sealed",
      price_dzd: 50000,
      stock_quantity: 1,
      availability: "available",
      specs: PRODUCTS[0].specs,
      seller_personal_note: PRODUCTS[0].seller_personal_note,
    });

    // 2. Fire 2 simultaneous order transactions for the last remaining unit (stock = 1)
    const results = await Promise.allSettled([
      createOrderTransaction({
        customer_full_name: "زبون التزامن الأول",
        customer_phone: "0551112233",
        wilaya_code: "16",
        commune: "باب الزوار",
        shipping_method: "stop_desk",
        purchase_method: "direct_checkout",
        items: [{ product_id: testProdId, quantity: 1 }],
      }),
      createOrderTransaction({
        customer_full_name: "زبون التزامن الثاني",
        customer_phone: "0662223344",
        wilaya_code: "16",
        commune: "القبة",
        shipping_method: "stop_desk",
        purchase_method: "direct_checkout",
        items: [{ product_id: testProdId, quantity: 1 }],
      }),
    ]);

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<any> => r.status === "fulfilled"
    );
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );

    // Exactly ONE must succeed and ONE must be rejected due to FOR UPDATE lock & stock check
    assert.equal(fulfilled.length, 1, "Exactly one concurrent order must succeed");
    assert.equal(rejected.length, 1, "Second concurrent order must fail when stock is 1");

    const winningOrder = fulfilled[0].value;
    createdOrderIds.push(winningOrder.id);

    const afterPurchase = await getProductById(testProdId);
    assert.equal(afterPurchase?.stock_quantity, 0);
    assert.equal(afterPurchase?.availability, "sold");

    // 3. Cancel the winning order and verify stock is restored to 1 and availability to 'available'
    const cancelled = await transitionOrderStatusInDb(
      winningOrder.id,
      "cancelled",
      "اختبار استرجاع المخزون"
    );
    assert.equal(cancelled.status, "cancelled");

    const afterCancel = await getProductById(testProdId);
    assert.equal(afterCancel?.stock_quantity, 1);
    assert.equal(afterCancel?.availability, "available");

    // 4. Test duplicate double-click order prevention (same phone, wilaya & total within 15 seconds)
    const firstOrder = await createOrderTransaction({
      customer_full_name: "زبون اختبار التكرار",
      customer_phone: "0773334455",
      wilaya_code: "16",
      commune: "حيدرة",
      shipping_method: "stop_desk",
      purchase_method: "direct_checkout",
      items: [{ product_id: testProdId, quantity: 1 }],
    });
    createdOrderIds.push(firstOrder.id);

    // Restore stock to 2 so stock doesn't block the duplicate check
    await db
      .update(products)
      .set({ stockQuantity: 2, availability: "available" })
      .where(eq(products.id, testProdId));

    await assert.rejects(
      async () => {
        await createOrderTransaction({
          customer_full_name: "زبون اختبار التكرار",
          customer_phone: "0773334455",
          wilaya_code: "16",
          commune: "حيدرة",
          shipping_method: "stop_desk",
          purchase_method: "direct_checkout",
          items: [{ product_id: testProdId, quantity: 1 }],
        });
      },
      /تم تسجيل طلب مطابق/,
      "Duplicate order within 15 seconds must be rejected"
    );
  } finally {
    // Cleanup test orders and test product
    for (const oid of createdOrderIds) {
      await db.delete(orders).where(eq(orders.id, oid)).catch(() => {});
    }
    await deleteOrHideProductInDb(testProdId).catch(() => {});
  }
});

test("Security & Telegram: compromised default password rejected, HMAC tokens validated, and duplicate Telegram webhooks ignored", async () => {
  assert.equal(verifyPasswordTimingSafe("dzphone-admin-2026"), false);

  const token = createAdminSessionToken("test-admin");
  assert.equal(verifyAdminSessionToken(token), true);
  assert.equal(verifyAdminSessionToken(token + "tampered"), false);
  assert.equal(verifyAdminSessionToken("invalid.token"), false);

  const sampleWebhook = {
    update_id: 99887766,
    callback_query: {
      id: "cb-dedupe-test-1",
      from: { id: 111 },
      message: { chat: { id: 222 } },
      data: "o:cf:ORD-TEST",
    },
  };
  const firstCall = await handleTelegramWebhookUpdate(sampleWebhook);
  assert.equal(Boolean(firstCall.duplicate), false);

  const replayCall = await handleTelegramWebhookUpdate(sampleWebhook);
  assert.equal(replayCall.duplicate, true);
});

test("production admin secrets reject example placeholders and weak defaults", () => {
  const oldPassword = process.env.ADMIN_PASSWORD;
  const oldHash = process.env.ADMIN_PASSWORD_HASH;
  const oldSecret = process.env.ADMIN_SESSION_SECRET;
  try {
    delete process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD = "REPLACE_WITH_STRONG_ADMIN_PASSWORD";
    process.env.ADMIN_SESSION_SECRET = "REPLACE_WITH_64_CHAR_RANDOM_HMAC_SECRET";
    assert.equal(isAdminPasswordConfigured(), false);
    assert.equal(isAdminSessionSecretConfigured(), false);

    process.env.ADMIN_PASSWORD = "A-strong-long-passphrase-2026";
    process.env.ADMIN_SESSION_SECRET = "a".repeat(64);
    assert.equal(isAdminPasswordConfigured(), true);
    assert.equal(isAdminSessionSecretConfigured(), true);
  } finally {
    if (oldPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = oldPassword;
    if (oldHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = oldHash;
    if (oldSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = oldSecret;
  }
});

test("Firebase admin allowlist: rejects non-allowlisted email (403), unverified email (403), and accepts verified allowlisted email", async () => {
  const prevAdminEmails = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "owner@dzphone.dz, manager@dzphone.dz ";

  const invokeRequireAuth = async (mockClaims: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  }) => {
    setTokenVerifierForTesting(async () => mockClaims as any);
    let statusCode = 200;
    let bodyPayload: any = null;
    let nextCalled = false;

    const req = {
      headers: { authorization: "Bearer mock-firebase-id-token" },
    } as unknown as AuthRequest;

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        bodyPayload = data;
        return this;
      },
    } as any;

    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    return { statusCode, bodyPayload, nextCalled, user: req.user };
  };

  try {
    // 1. Non-allowlisted email -> 403
    const nonAllowlisted = await invokeRequireAuth({
      uid: "intruder-1",
      email: "intruder@gmail.com",
      email_verified: true,
    });
    assert.equal(nonAllowlisted.statusCode, 403);
    assert.equal(nonAllowlisted.nextCalled, false);
    assert.ok(String(nonAllowlisted.bodyPayload?.error || "").includes("غير مصرح"));

    // 2. Unverified allowlisted email -> 403
    const unverified = await invokeRequireAuth({
      uid: "owner-unverified",
      email: "owner@dzphone.dz",
      email_verified: false,
    });
    assert.equal(unverified.statusCode, 403);
    assert.equal(unverified.nextCalled, false);

    // 3. Verified + allowlisted email (case-insensitive) -> accepted
    const accepted = await invokeRequireAuth({
      uid: "owner-verified",
      email: "Owner@DZPhone.dz",
      email_verified: true,
    });
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.nextCalled, true);
    assert.ok(accepted.user);

    // 4. Empty ADMIN_EMAILS -> fail closed (403)
    process.env.ADMIN_EMAILS = "";
    const emptyAllowlist = await invokeRequireAuth({
      uid: "owner-verified",
      email: "owner@dzphone.dz",
      email_verified: true,
    });
    assert.equal(emptyAllowlist.statusCode, 403);
    assert.equal(emptyAllowlist.nextCalled, false);
  } finally {
    setTokenVerifierForTesting(null);
    if (prevAdminEmails === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = prevAdminEmails;
    }
  }
});

test("Rate limiter keys by req.ip and ignores spoofed x-forwarded-for or x-visitor-token headers", () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 2,
    errorMessage: "Rate limit exceeded",
  });

  const makeReqRes = (spoofedXff: string, spoofedVisitor: string) => {
    let statusCode = 200;
    let nextCalled = false;
    const req = {
      ip: "198.51.100.42",
      headers: {
        "x-forwarded-for": spoofedXff,
        "x-visitor-token": spoofedVisitor,
      },
      header(name: string) {
        return (this.headers as Record<string, string>)[name.toLowerCase()];
      },
    } as any;
    const res = {
      setHeader() {},
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    } as any;
    limiter(req, res, () => {
      nextCalled = true;
    });
    return { statusCode, nextCalled };
  };

  const r1 = makeReqRes("10.0.0.1", "visitor-a");
  assert.equal(r1.statusCode, 200);
  assert.equal(r1.nextCalled, true);

  const r2 = makeReqRes("10.0.0.2", "visitor-b");
  assert.equal(r2.statusCode, 200);
  assert.equal(r2.nextCalled, true);

  // 3rd request from same req.ip with rotating spoofed X-Forwarded-For & visitor token must be blocked (429)
  const r3 = makeReqRes("10.0.0.3", "visitor-c");
  assert.equal(r3.statusCode, 429);
  assert.equal(r3.nextCalled, false);
});

test("Chat session privacy: wrong or missing visitor token returns null (404)", async () => {
  const ownerToken = "visitor-secret-token-owner-999";
  const attackerToken = "visitor-secret-token-attacker-000";
  let createdSessionId = "";

  try {
    const session = await getOrCreateChatSessionInDb({
      visitorToken: ownerToken,
      productId: PRODUCTS[0].id,
      locale: "ar",
    });
    createdSessionId = session.id;
    assert.ok(session.id.startsWith("chat-"));
    // 16 random bytes = 32 hex chars + 5 chars ("chat-") = 37 chars
    assert.equal(session.id.length, 37);

    // Owner token succeeds
    const validAccess = await getChatSessionForVisitorInDb(
      session.id,
      ownerToken
    );
    assert.ok(validAccess);
    assert.equal(validAccess?.id, session.id);

    // Wrong visitor token returns null (mapped to 404 by route)
    const wrongAccess = await getChatSessionForVisitorInDb(
      session.id,
      attackerToken
    );
    assert.equal(wrongAccess, null);

    // Missing visitor token returns null
    const emptyAccess = await getChatSessionForVisitorInDb(session.id, "");
    assert.equal(emptyAccess, null);
  } finally {
    if (createdSessionId) {
      await db
        .delete(chatSessions)
        .where(eq(chatSessions.id, createdSessionId))
        .catch(() => {});
    }
  }
});

test("Zod validation rejects invalid settings, product, and wilaya payloads", () => {
  // 1. Settings validation
  assert.equal(
    AdminSettingsSchema.safeParse({
      whatsapp: "213555123456",
      instagram: "dzphone.dz",
      messenger: "dzphone_store",
    }).success,
    true
  );
  assert.equal(
    AdminSettingsSchema.safeParse({
      whatsapp: "",
      instagram: "dzphone",
      messenger: "dzphone",
    }).success,
    true
  );
  assert.equal(
    AdminSettingsSchema.safeParse({
      whatsapp: "javascript:alert(1)",
      instagram: "dzphone",
      messenger: "dzphone",
    }).success,
    false
  );
  assert.equal(
    AdminSettingsSchema.safeParse({
      whatsapp: "213555123456",
      instagram: "bad/handle?xss=1",
      messenger: "dzphone",
    }).success,
    false
  );

  // 2. Wilaya patch validation
  assert.equal(
    AdminWilayaPatchSchema.safeParse({
      home_delivery_price: 900,
      stop_desk_price: 500,
      is_active: true,
    }).success,
    true
  );
  assert.equal(
    AdminWilayaPatchSchema.safeParse({
      home_delivery_price: -100,
    }).success,
    false
  );
  assert.equal(AdminWilayaPatchSchema.safeParse({}).success, false);

  // 3. Product create validation
  assert.equal(
    AdminProductCreateSchema.safeParse({
      sku: "BAD-PRICE",
      brand: "Apple",
      commercial_name: "iPhone",
      name: { ar: "آيفون", fr: "iPhone", en: "iPhone" },
      price_dzd: -5000,
      condition: "new_sealed",
      specs: PRODUCTS[0].specs,
      seller_personal_note: PRODUCTS[0].seller_personal_note,
    }).success,
    false
  );

  // 4. Unlock checkout discount validation
  assert.equal(
    AdminUnlockCheckoutSchema.safeParse({ discount_dzd: -50 }).success,
    false
  );
});

