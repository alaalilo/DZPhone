import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import compression from "compression";
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import {
  appendChatMessageInDb,
  getPublicProductById,
  createOrderTransaction,
  createProductInDb,
  deleteOrHideProductInDb,
  formatChatSessionDto,
  getChatSessionForVisitorInDb,
  getOrCreateChatSessionInDb,
  getSettingsFromDb,
  listAllAdminProducts,
  listAllChatSessionsFromDb,
  listAvailableProducts,
  listOrdersFromDb,
  listOutboxEventsFromDb,
  listWilayas,
  trackOrderInDb,
  transitionOrderStatusInDb,
  unlockCheckoutInDb,
  updateProductInDb,
  updateSettingsInDb,
  updateWilayaInDb,
} from "./src/db/repository.ts";
import {
  checkDatabaseConnection,
  hasDatabaseConfiguration,
} from "./src/db/index.ts";
import {
  type AuthRequest,
  createAdminSessionToken,
  createRateLimiter,
  isAdminPasswordConfigured,
  isAdminSessionSecretConfigured,
  isPreviewAuthEnabled,
  requireAuth,
  securityHeadersMiddleware,
  verifyPasswordTimingSafe,
} from "./src/middleware/auth.ts";
import {
  flushPendingOutboxEvents,
  handleTelegramWebhookUpdate,
  isTelegramConfigured,
  startTelegramOutboxWorker,
} from "./src/modules/notifications/telegram.service.ts";
import { generateSalesAssistantReply } from "./src/modules/ai/sales-assistant.ts";
import {
  AdminOrderStatusPatchSchema,
  AdminProductCreateSchema,
  AdminProductPatchSchema,
  AdminSettingsSchema,
  AdminUnlockCheckoutSchema,
  AdminWilayaPatchSchema,
  ChatMessageSendSchema,
  ChatSessionCreateSchema,
  OrderCreateSchema,
  OrderTrackSchema,
} from "./src/lib/validation.ts";

dotenv.config();

// npm start is the production entry point; npm run dev and direct tsx invocations stay in development.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = process.env.npm_lifecycle_event === "start"
    ? "production"
    : "development";
}

process.on("unhandledRejection", (reason) => {
  console.error("Fatal unhandled Promise Rejection; terminating to avoid serving in an unknown state:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Fatal uncaught Exception; terminating to avoid serving in an unknown state:", err);
  process.exit(1);
});

const GENERIC_SERVER_ERROR = "حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.";

const loginRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  errorMessage: "محاولات تسجيل دخول كثيرة جداً. يرجى الانتظار دقيقة.",
});

const orderRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 15,
  errorMessage: "تم تجاوز الحد المسموح للطلبات المتتالية. يرجى المحاولة بعد قليل.",
});

const orderTrackRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  errorMessage: "محاولات تتبع كثيرة جداً. يرجى الانتظار دقيقة.",
});

const chatSessionCreateRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  errorMessage: "تم إنشاء جلسات محادثة كثيرة جداً. يرجى الانتظار دقيقة.",
});

const chatRateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 35,
  errorMessage: "الكثير من الرسائل المتتالية. يرجى الانتظار لحظات.",
});

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const missing: string[] = [];
    if (!hasDatabaseConfiguration()) missing.push("DATABASE_URL or SQL_* database settings");
    if (!isAdminPasswordConfigured()) missing.push("ADMIN_PASSWORD or ADMIN_PASSWORD_HASH");
    if (!isAdminSessionSecretConfigured()) {
      missing.push("ADMIN_SESSION_SECRET (64 hexadecimal characters generated from 32 random bytes)");
    }
    if (!process.env.APP_URL?.startsWith("https://")) {
      missing.push("APP_URL (public HTTPS URL)");
    }
    if (!process.env.UPLOADS_DIR?.trim()) {
      missing.push("UPLOADS_DIR (mounted persistent storage outside public/ and dist/)");
    }
    if (missing.length) {
      throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
    }
    await checkDatabaseConnection();
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const uploadDirectory = path.resolve(
    process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads")
  );
  const publicDirectory = path.resolve(process.cwd(), "public");
  const distDirectory = path.resolve(process.cwd(), "dist");
  const isWithin = (parent: string, child: string) => {
    const relative = path.relative(parent, child);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  };
  if (isWithin(publicDirectory, uploadDirectory) || isWithin(distDirectory, uploadDirectory)) {
    throw new Error("UPLOADS_DIR must be outside public/ and dist/ directories.");
  }
  await fs.promises.mkdir(uploadDirectory, { recursive: true });

  const parsedTrustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
  app.set(
    "trust proxy",
    Number.isFinite(parsedTrustProxyHops) && parsedTrustProxyHops >= 0
      ? parsedTrustProxyHops
      : 1
  );

  app.use(securityHeadersMiddleware);
  app.use(compression());

  // Never expose .env files, source archives (.zip), database dumps (.sql), or private server files publicly
  app.use((req: Request, res: Response, next: NextFunction) => {
    const reqPath = decodeURIComponent(req.path || "").toLowerCase();
    if (
      reqPath.includes("/.env") ||
      reqPath.startsWith("/.git") ||
      reqPath.startsWith("/docs") ||
      reqPath.endsWith(".zip") ||
      reqPath.endsWith(".sql") ||
      reqPath === "/server.ts" ||
      reqPath.includes("drizzle.config")
    ) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (
      reqPath.startsWith("/api/admin") ||
      reqPath.startsWith("/api/orders") ||
      reqPath.startsWith("/api/chat/")
    ) {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
      );
    }
    next();
  });

  app.use(express.json({ limit: "512kb" }));

  function resolveBaseUrl(req?: Request): string {
    const envUrl = (process.env.APP_URL || "").trim();
    if (envUrl && envUrl !== "MY_APP_URL" && /^https?:\/\//i.test(envUrl)) {
      return envUrl.replace(/\/$/, "");
    }
    if (req) {
      const proto = req.protocol || "https";
      const host = req.get("host") || `localhost:${PORT}`;
      return `${proto}://${host}`.replace(/\/$/, "");
    }
    return "https://dzphone.dz";
  }

  function escapeHtmlAttr(val: string): string {
    return val
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function renderStorefrontHtml(
    rawHtml: string,
    req: Request
  ): Promise<string> {
    const baseUrl = resolveBaseUrl(req);
    const defaultImg = `${baseUrl}/images/products/iphone-15-pro-max-titanium.webp`;
    const productId =
      typeof req.query.product === "string" ? req.query.product.trim() : "";

    let html = rawHtml
      .replace(
        /<link rel="canonical" href="[^"]*"\s*\/?>/i,
        `<link rel="canonical" href="${escapeHtmlAttr(`${baseUrl}/`)}" />`
      )
      .replace(
        /<meta property="og:url" content="[^"]*"\s*\/?>/i,
        `<meta property="og:url" content="${escapeHtmlAttr(`${baseUrl}/`)}" />`
      )
      .replace(
        /<meta property="og:image" content="[^"]*"\s*\/?>/i,
        `<meta property="og:image" content="${escapeHtmlAttr(defaultImg)}" />`
      )
      .replace(
        /<meta name="twitter:image" content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:image" content="${escapeHtmlAttr(defaultImg)}" />`
      );

    if (!productId) {
      return html;
    }

    try {
      const product = await getPublicProductById(productId);
      if (!product) return html;

      const productUrl = `${baseUrl}/?product=${encodeURIComponent(product.id)}`;
      const firstImage = product.images?.[0];
      const firstImageUrl = firstImage?.url || "";
      const rawImg =
        firstImage?.webp_url ||
        (firstImageUrl.startsWith("/images/products/") && firstImageUrl.endsWith(".jpg")
          ? firstImageUrl.replace(/\.jpg$/i, ".webp")
          : firstImageUrl) ||
        "/images/products/iphone-15-pro-max-titanium.webp";
      const absImg = /^https?:\/\//i.test(rawImg)
        ? rawImg
        : `${baseUrl}${rawImg.startsWith("/") ? "" : "/"}${rawImg}`;

      const conditionAr =
        product.condition === "new_sealed"
          ? "جديد مغلق (Scellé)"
          : "مستعمل مفحوص بتقنية X-Ray";
      const titleText = `${product.name.ar} — ${product.price_dzd.toLocaleString("fr-DZ")} د.ج | DZPhone`;
      const descText = `${product.brand} ${product.commercial_name} (${conditionAr}) بسعر ${product.price_dzd.toLocaleString("fr-DZ")} د.ج. تتوفر خدمة التوصيل في الولايات المفعّلة فقط، والدفع عند الاستلام بعد التأكيد.`;
      const availabilityUrl =
        (["sold", "reserved", "hidden", "draft"].includes(product.availability || "") || (product.stock_quantity ?? 0) <= 0)
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock";

      const productJsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name.ar,
        sku: product.sku,
        brand: { "@type": "Brand", name: product.brand },
        image: [absImg],
        description: descText,
        offers: {
          "@type": "Offer",
          url: productUrl,
          price: product.price_dzd,
          priceCurrency: "DZD",
          availability: availabilityUrl,
          itemCondition:
            product.condition === "new_sealed"
              ? "https://schema.org/NewCondition"
              : "https://schema.org/UsedCondition",
        },
      };

      html = html
        .replace(
          /<title>[\s\S]*?<\/title>/i,
          `<title>${escapeHtmlAttr(titleText)}</title>`
        )
        .replace(
          /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
          `<meta name="description" content="${escapeHtmlAttr(descText)}" />`
        )
        .replace(
          /<link rel="canonical" href="[^"]*"\s*\/?>/i,
          `<link rel="canonical" href="${escapeHtmlAttr(productUrl)}" />`
        )
        .replace(
          /<meta property="og:url" content="[^"]*"\s*\/?>/i,
          `<meta property="og:url" content="${escapeHtmlAttr(productUrl)}" />`
        )
        .replace(
          /<meta property="og:title" content="[^"]*"\s*\/?>/i,
          `<meta property="og:title" content="${escapeHtmlAttr(titleText)}" />`
        )
        .replace(
          /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
          `<meta property="og:description" content="${escapeHtmlAttr(descText)}" />`
        )
        .replace(
          /<meta property="og:type" content="[^"]*"\s*\/?>/i,
          `<meta property="og:type" content="product" />`
        )
        .replace(
          /<meta property="og:image" content="[^"]*"\s*\/?>/i,
          `<meta property="og:image" content="${escapeHtmlAttr(absImg)}" />`
        )
        .replace(
          /<meta name="twitter:title" content="[^"]*"\s*\/?>/i,
          `<meta name="twitter:title" content="${escapeHtmlAttr(titleText)}" />`
        )
        .replace(
          /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
          `<meta name="twitter:description" content="${escapeHtmlAttr(descText)}" />`
        )
        .replace(
          /<meta name="twitter:image" content="[^"]*"\s*\/?>/i,
          `<meta name="twitter:image" content="${escapeHtmlAttr(absImg)}" />`
        )
        .replace(
          /<\/head>/i,
          `    <script id="dzphone-server-product-jsonld" type="application/ld+json">${JSON.stringify(productJsonLd).replace(/</g, "\\u003c")}</script>\n  </head>`
        );

      return html;
    } catch {
      return html;
    }
  }

  // ---------------- SEO Sitemap, Robots & Health ----------------
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      await checkDatabaseConnection();
      res.json({
        status: "ready",
        service: "dzphone-commercial-api",
        database: "ready",
        telegramConfigured: isTelegramConfigured(),
        mediaStorage: process.env.UPLOADS_DIR ? "configured" : "local-default-configure-persistent-volume-for-production",
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        status: "not_ready",
        service: "dzphone-commercial-api",
        database: "unavailable",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get("/robots.txt", (req: Request, res: Response) => {
    const baseUrl = resolveBaseUrl(req);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /api/admin/",
        "Disallow: /api/webhooks/",
        `Sitemap: ${baseUrl}/sitemap.xml`,
        "",
      ].join("\n")
    );
  });

  app.get("/sitemap.xml", async (req: Request, res: Response) => {
    try {
      const baseUrl = resolveBaseUrl(req);
      const list = await listAvailableProducts();
      const urls = [
        `<url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
        ...list.map(
          (p) =>
            `<url><loc>${baseUrl}/?product=${encodeURIComponent(p.id)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
        ),
      ].join("");
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
      );
    } catch (error) {
      console.error("Failed to generate sitemap:", error);
      res.status(500).end();
    }
  });

  // ---------------- Public Storefront Endpoints ----------------
  app.get("/api/products", async (_req: Request, res: Response) => {
    try {
      const list = await listAvailableProducts();
      res.json(list);
    } catch (error) {
      console.error("GET /api/products error:", error);
      res.status(500).json({ error: GENERIC_SERVER_ERROR });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const prod = await getPublicProductById(String(req.params.id));
      if (!prod) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(prod);
    } catch (error) {
      console.error("GET /api/products/:id error:", error);
      res.status(500).json({ error: GENERIC_SERVER_ERROR });
    }
  });

  // Authenticated image upload. Files are stored outside public/ and served through /media/:filename.
  app.post(
    "/api/admin/uploads/images",
    requireAuth,
    express.raw({
      type: ["image/jpeg", "image/png", "image/webp"],
      limit: "5mb",
    }),
    async (req: AuthRequest, res: Response) => {
      if (process.env.NODE_ENV === "production" && !process.env.UPLOADS_DIR) {
        return res.status(503).json({
          error: "رفع الصور غير مفعّل قبل إعداد مجلد تخزين دائم عبر UPLOADS_DIR.",
        });
      }
      const contentType = (req.header("content-type") || "").split(";")[0].toLowerCase();
      const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const signatures: Record<string, { ext: string; valid: (b: Buffer) => boolean }> = {
        "image/jpeg": { ext: "jpg", valid: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
        "image/png": { ext: "png", valid: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
        "image/webp": { ext: "webp", valid: (b) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
      };
      const signature = signatures[contentType];
      if (!signature || bytes.length === 0 || !signature.valid(bytes)) {
        return res.status(400).json({ error: "ملف الصورة غير صالح أو نوعه غير مدعوم." });
      }
      try {
        const fileName = `${crypto.randomBytes(24).toString("hex")}.${signature.ext}`;
        await fs.promises.writeFile(path.join(uploadDirectory, fileName), bytes, {
          flag: "wx",
          mode: 0o600,
        });
        return res.status(201).json({
          url: `/media/${fileName}`,
          source_type: "merchant_uploaded_photo",
          sort_order: 0,
        });
      } catch (error) {
        console.error("Product image upload failed:", error);
        return res.status(500).json({ error: "تعذر حفظ الصورة. تحقق من مساحة التخزين وصلاحيات المجلد." });
      }
    }
  );

  app.get("/media/:filename", async (req: Request, res: Response) => {
    const filename = String(req.params.filename || "");
    if (!/^[a-f0-9]{48}\.(jpg|png|webp)$/.test(filename)) {
      return res.sendStatus(404);
    }
    const absolutePath = path.join(uploadDirectory, filename);
    try {
      await fs.promises.access(absolutePath, fs.constants.R_OK);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.sendFile(absolutePath);
    } catch {
      return res.sendStatus(404);
    }
  });

  app.get("/api/shipping/wilayas", async (_req: Request, res: Response) => {
    try {
      const list = await listWilayas(true);
      res.json(list);
    } catch (error) {
      console.error("GET /api/shipping/wilayas error:", error);
      res.status(500).json({ error: GENERIC_SERVER_ERROR });
    }
  });

  app.get("/api/settings", async (_req: Request, res: Response) => {
    try {
      const s = await getSettingsFromDb();
      res.json(s);
    } catch (error) {
      console.error("GET /api/settings error:", error);
      res.status(500).json({ error: GENERIC_SERVER_ERROR });
    }
  });

  app.post(
    "/api/orders",
    orderRateLimiter,
    async (req: Request, res: Response) => {
      const parsed = OrderCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "البيانات المدخلة غير مكتملة أو غير صالحة.",
        });
      }

      try {
        const order = await createOrderTransaction(parsed.data);
        void flushPendingOutboxEvents();
        res.status(201).json(order);
      } catch (error: any) {
        res.status(400).json({
          error: error?.message || "تعذر إنشاء الطلب.",
        });
      }
    }
  );

  app.post(
    "/api/orders/track",
    orderTrackRateLimiter,
    async (req: Request, res: Response) => {
      const parsed = OrderTrackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "يرجى إدخال رقم الطلب ورقم الهاتف بشكل صحيح.",
        });
      }
      try {
        const tracked = await trackOrderInDb(
          parsed.data.order_number,
          parsed.data.customer_phone
        );
        if (!tracked) {
          return res.status(404).json({
            error: "لم يتم العثور على طلب مطابق.",
          });
        }
        res.json({
          status: tracked.status,
          created_at: tracked.created_at,
        });
      } catch (error) {
        console.error("POST /api/orders/track error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.post(
    "/api/chat/sessions",
    chatSessionCreateRateLimiter,
    async (req: Request, res: Response) => {
      const parsed = ChatSessionCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid chat session request" });
      }
      const visitorToken = String(req.header("x-visitor-token") || "").trim();
      if (!visitorToken) {
        return res.status(400).json({ error: "Missing visitor token" });
      }

      try {
        const session = await getOrCreateChatSessionInDb({
          visitorToken,
          productId: parsed.data.product_id,
          locale: parsed.data.locale,
        });
        res.json(session);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("المنتج غير متاح للمحادثة")) {
          return res.status(404).json({ error: message });
        }
        console.error("POST /api/chat/sessions error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.get(
    "/api/chat/sessions/:id/messages",
    async (req: Request, res: Response) => {
      try {
        const visitorToken = req.header("x-visitor-token");
        const session = await getChatSessionForVisitorInDb(
          String(req.params.id),
          visitorToken
        );
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }
        res.json({ session });
      } catch (error) {
        console.error("GET /api/chat/sessions/:id/messages error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.post(
    "/api/chat/sessions/:id/messages",
    chatRateLimiter,
    async (req: Request, res: Response) => {
      const parsed = ChatMessageSendSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid message payload" });
      }

      const sessionId = String(req.params.id);
      const visitorToken = req.header("x-visitor-token");
      try {
        const currentSession = await getChatSessionForVisitorInDb(
          sessionId,
          visitorToken
        );
        if (!currentSession) {
          return res.status(404).json({ error: "Session not found" });
        }

        await appendChatMessageInDb({
          sessionId,
          sender: "customer",
          content: parsed.data.content,
        });

        // If human agent was already requested, AI bot stays silent
        if (
          currentSession.needs_human_agent &&
          parsed.data.intent !== "request_human"
        ) {
          const updated = await formatChatSessionDto(sessionId);
          return res.json({ session: updated });
        }

        const aiResult = await generateSalesAssistantReply({
          sessionId,
          productId: currentSession.product_id,
          locale: currentSession.locale,
          customerMessage: parsed.data.content,
          explicitIntent: parsed.data.intent,
        });

        if (aiResult.escalated) {
          void flushPendingOutboxEvents();
        } else if (aiResult.assistantReply) {
          await appendChatMessageInDb({
            sessionId,
            sender: "assistant",
            content: aiResult.assistantReply,
          });
        }

        const updated = await formatChatSessionDto(sessionId);
        res.json({ session: updated });
      } catch (error) {
        console.error("POST /api/chat/sessions/:id/messages error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  // ---------------- Telegram Webhook ----------------
  app.post("/api/webhooks/telegram", async (req: Request, res: Response) => {
    const received = String(
      req.header("x-telegram-bot-api-secret-token") ?? ""
    );
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
    if (!expected || !safeEqual(received, expected)) {
      return res.sendStatus(401);
    }

    try {
      await handleTelegramUpdateWrapper(req.body);
      return res.sendStatus(200);
    } catch (err) {
      console.error("Telegram webhook handler failed:", err);
      return res.sendStatus(500);
    }
  });

  // ---------------- Admin Authentication & Protected Routes ----------------
  app.get("/api/admin/auth-config", (_req: Request, res: Response) => {
    res.json({
      passwordConfigured: isAdminPasswordConfigured(),
      previewAuthEnabled: isPreviewAuthEnabled(),
      telegramConfigured: isTelegramConfigured(),
    });
  });

  app.post(
    "/api/admin/login",
    loginRateLimiter,
    async (req: Request, res: Response) => {
      const password = String(req.body?.password ?? "");
      if (!isAdminPasswordConfigured()) {
        return res.status(400).json({
          error:
            "لم يتم تعيين ADMIN_PASSWORD في متغيرات البيئة. استخدم تسجيل الدخول عبر Google أو جلسة المعاينة المحلية.",
        });
      }
      if (!password || !verifyPasswordTimingSafe(password)) {
        return res.status(401).json({
          error: "كلمة المرور غير صحيحة",
        });
      }
      const token = createAdminSessionToken("admin");
      res.json({
        token,
        email: "admin@dzphone.dz",
      });
    }
  );

  app.post(
    "/api/admin/preview-session",
    loginRateLimiter,
    async (_req: Request, res: Response) => {
      if (!isPreviewAuthEnabled()) {
        return res.status(403).json({
          error: "جلسة المعاينة غير متاحة في بيئة الإنتاج.",
        });
      }
      const token = createAdminSessionToken("preview-admin");
      res.json({
        token,
        email: "preview-operator@dzphone.dz",
      });
    }
  );

  app.post(
    "/api/admin/chats/:id/unlock-checkout",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      const parsed = AdminUnlockCheckoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "قيمة الخصم غير صالحة.",
        });
      }
      try {
        await unlockCheckoutInDb(String(req.params.id), parsed.data.discount_dzd);
        const updated = await formatChatSessionDto(String(req.params.id));
        res.json({ session: updated });
      } catch (error: any) {
        res.status(400).json({
          error: error?.message || "تعذر فتح الشراء لهذه المحادثة.",
        });
      }
    }
  );

  app.get(
    "/api/admin/products",
    requireAuth,
    async (_req: AuthRequest, res: Response) => {
      try {
        const list = await listAllAdminProducts();
        res.json(list);
      } catch (error) {
        console.error("GET /api/admin/products error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.post(
    "/api/admin/products",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      const parsed = AdminProductCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "بيانات الهاتف غير مكتملة أو غير صالحة.",
        });
      }
      try {
        const created = await createProductInDb(parsed.data);
        res.status(201).json(created);
      } catch (error) {
        console.error("POST /api/admin/products error:", error);
        res.status(400).json({
          error: "تعذر إنشاء الهاتف. تحقق من رمز SKU والبيانات.",
        });
      }
    }
  );

  app.patch(
    "/api/admin/products/:id",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      const parsed = AdminProductPatchSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          error: "بيانات التحديث غير صالحة.",
        });
      }
      try {
        const updated = await updateProductInDb(
          String(req.params.id),
          parsed.data
        );
        if (!updated) {
          return res.status(404).json({ error: "Product not found" });
        }
        res.json(updated);
      } catch (error) {
        console.error("PATCH /api/admin/products/:id error:", error);
        res.status(400).json({
          error: "تعذر تحديث بيانات الهاتف.",
        });
      }
    }
  );

  app.delete(
    "/api/admin/products/:id",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const result = await deleteOrHideProductInDb(String(req.params.id));
        res.json(result);
      } catch (error) {
        console.error("DELETE /api/admin/products/:id error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.get(
    "/api/admin/orders",
    requireAuth,
    async (_req: AuthRequest, res: Response) => {
      try {
        const list = await listOrdersFromDb();
        res.json(list);
      } catch (error) {
        console.error("GET /api/admin/orders error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.patch(
    "/api/admin/orders/:id/status",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      const parsed = AdminOrderStatusPatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "حالة الطلب غير صالحة.",
        });
      }
      try {
        const updated = await transitionOrderStatusInDb(
          String(req.params.id),
          parsed.data.status,
          parsed.data.admin_note
        );
        res.json(updated);
      } catch (error: any) {
        res.status(400).json({
          error: error?.message || "تعذر تحديث حالة الطلب.",
        });
      }
    }
  );

  app.get(
    "/api/admin/chats",
    requireAuth,
    async (_req: AuthRequest, res: Response) => {
      try {
        const list = await listAllChatSessionsFromDb();
        res.json(list);
      } catch (error) {
        console.error("GET /api/admin/chats error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.get(
    "/api/admin/chats/:id",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const ses = await formatChatSessionDto(String(req.params.id));
        if (!ses) return res.status(404).json({ error: "Chat not found" });
        res.json(ses);
      } catch (error) {
        console.error("GET /api/admin/chats/:id error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.post(
    "/api/admin/chats/:id/messages",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const content = String(req.body?.content ?? "").trim();
        if (!content || content.length > 1000) {
          return res.status(400).json({ error: "Empty or invalid message" });
        }
        const sessionId = String(req.params.id);
        await appendChatMessageInDb({
          sessionId,
          sender: "human_agent",
          content,
        });
        const updated = await formatChatSessionDto(sessionId);
        res.json({ session: updated });
      } catch (error) {
        console.error("POST /api/admin/chats/:id/messages error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.get(
    "/api/admin/wilayas",
    requireAuth,
    async (_req: AuthRequest, res: Response) => {
      try {
        const list = await listWilayas(true);
        res.json(list);
      } catch (error) {
        console.error("GET /api/admin/wilayas error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.patch(
    "/api/admin/wilayas/:code",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      const parsed = AdminWilayaPatchSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          error: "بيانات تسعير الولاية غير صالحة.",
        });
      }
      try {
        const updated = await updateWilayaInDb(
          String(req.params.code),
          parsed.data
        );
        if (!updated) {
          return res.status(404).json({ error: "Wilaya not found" });
        }
        res.json(updated);
      } catch (error) {
        console.error("PATCH /api/admin/wilayas/:code error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.patch(
    "/api/admin/settings",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      const parsed = AdminSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "بيانات قنوات التواصل غير صالحة.",
        });
      }
      try {
        const updated = await updateSettingsInDb(parsed.data);
        res.json(updated);
      } catch (error) {
        console.error("PATCH /api/admin/settings error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  app.get(
    "/api/admin/outbox",
    requireAuth,
    async (_req: AuthRequest, res: Response) => {
      try {
        await flushPendingOutboxEvents();
        const outbox = await listOutboxEventsFromDb();
        res.json({
          outbox,
          telegramConfigured: isTelegramConfigured(),
        });
      } catch (error) {
        console.error("GET /api/admin/outbox error:", error);
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  // ---------------- Vite / Static Serving ----------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.get(["/", "/index.html"], async (req, res, next) => {
      try {
        const indexPath = path.join(process.cwd(), "index.html");
        const rawTemplate = fs.readFileSync(indexPath, "utf-8");
        const populated = await renderStorefrontHtml(rawTemplate, req);
        const transformed = await vite.transformIndexHtml(
          req.originalUrl,
          populated
        );
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(transformed);
      } catch (err) {
        next(err);
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const distIndexPath = path.join(distPath, "index.html");
    const cachedDistIndex = fs.existsSync(distIndexPath)
      ? fs.readFileSync(distIndexPath, "utf-8")
      : "";
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader(
              "Cache-Control",
              "public, max-age=31536000, immutable"
            );
          } else {
            res.setHeader("Cache-Control", "public, max-age=3600");
          }
        },
      })
    );
    app.use(async (req, res) => {
      if (!cachedDistIndex) {
        return res.sendFile(distIndexPath);
      }
      const html = await renderStorefrontHtml(cachedDistIndex, req);
      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
    });
  }

  // Global Express Error Handler
  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Unhandled Express error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: GENERIC_SERVER_ERROR });
      }
    }
  );

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `DZPhone Commercial Full-Stack Server running on http://localhost:${PORT}`
    );
    startTelegramOutboxWorker();
  });
  httpServer.on("error", (error) => {
    console.error("HTTP server failed:", error);
    process.exitCode = 1;
  });
}

async function handleTelegramUpdateWrapper(update: any) {
  await handleTelegramWebhookUpdate(update);
}

startServer();
