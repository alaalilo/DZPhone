import { eq } from "drizzle-orm";
import { db, pool } from "../../db/index.ts";
import { chatSessions } from "../../db/schema.ts";
import {
  formatPhoneForTelegramDisplay,
  mapTelegramActionToStatus,
} from "../../lib/domain-rules.ts";
import { transitionOrderStatusInDb } from "../../db/repository.ts";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch]!
  );
}

export function isTelegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID
  );
}

async function telegramCall<T>(method: string, payload: unknown): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN غير مضبوط في متغيرات البيئة");
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json();
  if (!response.ok || body.ok !== true) {
    throw new Error(
      `Telegram ${method} failed: ${body.description ?? response.status}`
    );
  }
  return body.result as T;
}

export async function sendOrderTelegramNotification(payload: {
  orderId: string;
  orderNumber: string;
  customerFullName: string;
  customerPhoneE164: string;
  wilayaCode: string;
  wilayaName: string;
  commune: string;
  shippingMethod: string;
  items: { name: string; quantity: number; lineTotalDzd: number }[];
  itemsSubtotalDzd: number;
  discountDzd?: number;
  shippingPriceDzd: number;
  totalPriceDzd: number;
}) {
  const phoneForDisplay = formatPhoneForTelegramDisplay(
    payload.customerPhoneE164
  );
  const phoneE164 = payload.customerPhoneE164.replace(/[^+0-9]/g, "");
  const appBase = process.env.APP_URL || "http://localhost:3000";
  const adminUrl = new URL(appBase);
  adminUrl.searchParams.set("admin", "1");
  adminUrl.searchParams.set("order", payload.orderId);
  const text = [
    `🛒 <b>طلب جديد #${escapeHtml(payload.orderNumber)}</b>`,
    "━━━━━━━━━━━━━━━━",
    `👤 الزبون: ${escapeHtml(payload.customerFullName)}`,
    // Telegram clients auto-link internationally formatted phone numbers. Avoid unsupported tel: HTML entities.
    `📞 الهاتف: ${escapeHtml(phoneE164 || phoneForDisplay)}`,
    `📍 الولاية: ${escapeHtml(payload.wilayaName)} (${escapeHtml(payload.wilayaCode)})`,
    `🏙️ البلدية: ${escapeHtml(payload.commune)}`,
    `🚚 التوصيل: ${payload.shippingMethod === "home_delivery" ? "إلى المنزل" : "إلى المكتب"}`,
    "",
    ...payload.items.map(
      (item) =>
        `📱 ${escapeHtml(item.name)} × ${item.quantity} — ${item.lineTotalDzd.toLocaleString("fr-DZ")} دج`
    ),
    `💵 المنتجات: ${payload.itemsSubtotalDzd.toLocaleString("fr-DZ")} دج`,
    ...(payload.discountDzd && payload.discountDzd > 0
      ? [`🎁 الخصم: -${payload.discountDzd.toLocaleString("fr-DZ")} دج`]
      : []),
    `🚚 التوصيل: ${payload.shippingPriceDzd.toLocaleString("fr-DZ")} دج`,
    "━━━━━━━━━━━━━━━━",
    `💰 <b>الإجمالي: ${payload.totalPriceDzd.toLocaleString("fr-DZ")} دج</b>`,
    "⏳ الحالة: بانتظار التأكيد الهاتفي",
  ].join("\n");

  return telegramCall("sendMessage", {
    chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "✅ تأكيد هاتفياً",
            callback_data: `o:cf:${payload.orderId}`,
          },
          { text: "📦 تم الشحن", callback_data: `o:sh:${payload.orderId}` },
        ],
        [
          { text: "🏁 تم التسليم", callback_data: `o:dl:${payload.orderId}` },
          { text: "❌ إلغاء", callback_data: `o:cx:${payload.orderId}` },
        ],
        [{ text: "فتح الطلب في لوحة التحكم", url: adminUrl.toString() }],
      ],
    },
  });
}

export async function sendHumanRequestTelegramNotification(payload: {
  sessionId: string;
  productName: string;
  reason: string;
  preferredLanguage: string;
}) {
  const appBase = process.env.APP_URL || "http://localhost:3000";
  const chatUrl = new URL(appBase);
  chatUrl.searchParams.set("admin", "1");
  chatUrl.searchParams.set("chat", payload.sessionId);
  const nowAlgiers = new Date().toLocaleString("sv-SE", {
    timeZone: "Africa/Algiers",
  });
  const text = [
    "🧑‍💼 <b>العميل يطلب التواصل مع البائع</b>",
    "━━━━━━━━━━━━━━━━",
    `📱 المنتج: ${escapeHtml(payload.productName || "غير محدد")}`,
    `👤 الجلسة: ${escapeHtml(payload.sessionId)}`,
    `🌐 اللغة: ${escapeHtml(payload.preferredLanguage)}`,
    `💬 السبب: ${escapeHtml(payload.reason)}`,
    `🕒 ${escapeHtml(nowAlgiers)} (Africa/Algiers)`,
    "",
    "يرجى فتح المحادثة والرد على العميل.",
  ].join("\n");

  return telegramCall("sendMessage", {
    chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💬 فتح المحادثة مباشرة", url: chatUrl.toString() },
          {
            text: "👤 استلام المحادثة",
            callback_data: `c:cl:${payload.sessionId}`,
          },
        ],
      ],
    },
  });
}

const processedWebhookKeys = new Map<string, number>();

function isDuplicateWebhookEvent(key: string): boolean {
  const now = Date.now();
  // Prune entries older than 1 hour
  for (const [k, ts] of processedWebhookKeys.entries()) {
    if (now - ts > 3600_000) processedWebhookKeys.delete(k);
  }
  if (processedWebhookKeys.has(key)) return true;
  processedWebhookKeys.set(key, now);
  return false;
}

type ClaimedOutboxEvent = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
};

let outboxFlushInFlight = false;
let outboxWorkerTimer: NodeJS.Timeout | null = null;

async function claimOutboxBatch(limit = 5): Promise<ClaimedOutboxEvent[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Expired events which already exhausted their retry budget become terminal failures.
    await client.query(
      `UPDATE notification_outbox
       SET status = 'failed', last_error = COALESCE(last_error, 'Retry limit exhausted')
       WHERE attempts >= 5
         AND status IN ('pending', 'processing')
         AND available_at <= NOW()`
    );

    // A lease in available_at lets another process safely recover events after a worker crash.
    const claimed = await client.query<ClaimedOutboxEvent>(
      `WITH candidates AS (
         SELECT id
         FROM notification_outbox
         WHERE attempts < 5
           AND (
             (status = 'pending' AND available_at <= NOW()) OR
             (status = 'processing' AND available_at <= NOW())
           )
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE notification_outbox AS event
       SET status = 'processing',
           attempts = event.attempts + 1,
           available_at = NOW() + INTERVAL '10 minutes'
       FROM candidates
       WHERE event.id = candidates.id
       RETURNING event.id, event.event_type, event.payload, event.attempts`,
      [limit]
    );
    await client.query("COMMIT");
    return claimed.rows;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function finishOutboxEvent(
  event: ClaimedOutboxEvent,
  error?: unknown
): Promise<void> {
  if (!error) {
    await pool.query(
      `UPDATE notification_outbox
       SET status = 'sent', sent_at = NOW(), last_error = NULL
       WHERE id = $1 AND status = 'processing'`,
      [event.id]
    );
    return;
  }

  const message = String((error as any)?.message || error).slice(0, 300);
  const exhausted = event.attempts >= 5;
  const delayMs = Math.min(30 * 60_000, Math.pow(2, event.attempts) * 5_000);
  await pool.query(
    `UPDATE notification_outbox
     SET status = $2,
         available_at = NOW() + ($3 * INTERVAL '1 millisecond'),
         last_error = $4
     WHERE id = $1 AND status = 'processing'`,
    [event.id, exhausted ? "failed" : "pending", delayMs, message]
  );
}

export async function flushPendingOutboxEvents(): Promise<void> {
  if (outboxFlushInFlight) return;
  outboxFlushInFlight = true;
  try {
    if (!isTelegramConfigured()) {
      // Keep events pending. Missing credentials must never be reported as successful delivery.
      await pool.query(
        `UPDATE notification_outbox
         SET last_error = 'Telegram delivery is not configured; event remains pending'
         WHERE status = 'pending' AND (last_error IS NULL OR last_error <> 'Telegram delivery is not configured; event remains pending')`
      );
      return;
    }

    const pending = await claimOutboxBatch(5);
    for (const event of pending) {
      try {
        if (event.event_type === "order.created") {
          await sendOrderTelegramNotification(event.payload as any);
        } else if (event.event_type === "chat.human_requested") {
          await sendHumanRequestTelegramNotification(event.payload as any);
        } else {
          throw new Error(`Unsupported notification event type: ${event.event_type}`);
        }
        await finishOutboxEvent(event);
      } catch (error) {
        console.error(`Telegram outbox delivery failed for event ${event.id}:`, error);
        await finishOutboxEvent(event, error).catch((updateError) => {
          console.error(`Failed to reschedule outbox event ${event.id}:`, updateError);
        });
      }
    }
  } catch (error) {
    console.error("Outbox flush error:", error);
  } finally {
    outboxFlushInFlight = false;
  }
}

export function startTelegramOutboxWorker(intervalMs = 15_000): void {
  if (outboxWorkerTimer) return;
  void flushPendingOutboxEvents();
  outboxWorkerTimer = setInterval(() => {
    void flushPendingOutboxEvents();
  }, Math.max(5_000, intervalMs));
  outboxWorkerTimer.unref();
}

export async function handleTelegramWebhookUpdate(update: any): Promise<{
  duplicate?: boolean;
  unauthorized?: boolean;
  processed?: boolean;
}> {
  const updateId = update?.update_id ? `u:${update.update_id}` : null;
  const q = update?.callback_query;
  const callbackId = q?.id ? `cb:${q.id}` : null;

  if (
    (updateId && isDuplicateWebhookEvent(updateId)) ||
    (callbackId && isDuplicateWebhookEvent(callbackId))
  ) {
    return { duplicate: true };
  }

  if (!q?.data) return { processed: false };

  const adminUserId = String(process.env.TELEGRAM_ADMIN_USER_ID ?? "");
  const adminChatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID ?? "");
  if (
    !adminUserId ||
    String(q.from?.id) !== adminUserId ||
    String(q.message?.chat?.id) !== adminChatId
  ) {
    if (isTelegramConfigured()) {
      void telegramCall("answerCallbackQuery", {
        callback_query_id: q.id,
        text: "غير مصرح لك بتنفيذ هذا الإجراء.",
        show_alert: true,
      }).catch(() => {});
    }
    return { unauthorized: true };
  }

  const orderMatch = /^o:(cf|sh|dl|cx):([A-Za-z0-9-]+)$/i.exec(q.data);
  if (orderMatch) {
    const [, action, orderId] = orderMatch;
    const nextStatus = mapTelegramActionToStatus(action.toLowerCase());
    if (!nextStatus) return { processed: false };

    try {
      const updated = await transitionOrderStatusInDb(orderId, nextStatus);
      void telegramCall("answerCallbackQuery", {
        callback_query_id: q.id,
        text: `تم تحديث حالة الطلب إلى ${updated.status}`,
      }).catch(() => {});
      return { processed: true };
    } catch (err: any) {
      void telegramCall("answerCallbackQuery", {
        callback_query_id: q.id,
        text: err?.message || "تعذر تحديث حالة الطلب",
        show_alert: true,
      }).catch(() => {});
      return { processed: false };
    }
  }

  const chatMatch = /^c:cl:([A-Za-z0-9-]+)$/i.exec(q.data);
  if (chatMatch) {
    const sessionId = chatMatch[1];
    await db
      .update(chatSessions)
      .set({ assignedAgentId: adminUserId, updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));
    void telegramCall("answerCallbackQuery", {
      callback_query_id: q.id,
      text: "تم استلام المحادثة. افتح لوحة التحكم للرد.",
    }).catch(() => {});
    return { processed: true };
  }

  return { processed: false };
}
