export type OrderStatus =
  | "pending_phone_confirmation"
  | "confirmed_by_call"
  | "shipped"
  | "delivered"
  | "cancelled";

export type ShippingMethod = "home_delivery" | "stop_desk";

export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_phone_confirmation: ["confirmed_by_call", "cancelled"],
  confirmed_by_call: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function normalizeAlgerianMobile(input: string): {
  national: string;
  e164: string;
} {
  const digits = input.replace(/[\s().-]/g, "");
  const national = digits.startsWith("+213")
    ? `0${digits.slice(4)}`
    : digits.startsWith("213") && digits.length === 12
      ? `0${digits.slice(3)}`
      : digits;

  if (!/^0[567]\d{8}$/.test(national)) {
    throw new Error(
      "أدخل رقم هاتف جزائري صحيحاً من 10 أرقام يبدأ بـ 05 أو 06 أو 07."
    );
  }
  return {
    national,
    e164: `+213${national.slice(1)}`,
  };
}

export function canTransitionOrderStatus(
  current: OrderStatus,
  next: OrderStatus
): boolean {
  return ALLOWED_ORDER_TRANSITIONS[current]?.includes(next) ?? false;
}

export function mapTelegramActionToStatus(
  action: string
): OrderStatus | null {
  switch (action) {
    case "cf":
      return "confirmed_by_call";
    case "sh":
      return "shipped";
    case "dl":
      return "delivered";
    case "cx":
      return "cancelled";
    default:
      return null;
  }
}

export function computeOrderTotals(input: {
  items: { unitPriceDzd: number; quantity: number }[];
  wilaya: {
    code: string;
    isActive: boolean;
    homeDeliveryPrice: number;
    stopDeskPrice: number;
  };
  shippingMethod: ShippingMethod;
  discountDzd?: number;
}): {
  itemsSubtotalDzd: number;
  discountDzd: number;
  shippingPriceDzd: number;
  totalPriceDzd: number;
} {
  if (!input.wilaya.isActive) {
    throw new Error("التوصيل إلى هذه الولاية غير مفعل حالياً.");
  }
  if (!input.items.length) {
    throw new Error("يجب أن يحتوي الطلب على منتج واحد على الأقل.");
  }

  let itemsSubtotalDzd = 0;
  for (const item of input.items) {
    const qty = Math.floor(item.quantity);
    const price = Math.floor(item.unitPriceDzd);
    if (qty <= 0 || price <= 0) {
      throw new Error("كمية المنتج أو سعره غير صالح.");
    }
    itemsSubtotalDzd += price * qty;
  }

  const shippingPriceDzd =
    input.shippingMethod === "home_delivery"
      ? Math.floor(input.wilaya.homeDeliveryPrice)
      : Math.floor(input.wilaya.stopDeskPrice);

  if (shippingPriceDzd < 0) {
    throw new Error("سعر التوصيل غير صالح.");
  }

  const rawDiscount = Math.max(0, Math.floor(input.discountDzd ?? 0));
  if (rawDiscount > itemsSubtotalDzd) {
    throw new Error("قيمة الخصم تتجاوز سعر المنتجات.");
  }

  const totalPriceDzd = itemsSubtotalDzd - rawDiscount + shippingPriceDzd;

  return {
    itemsSubtotalDzd,
    discountDzd: rawDiscount,
    shippingPriceDzd,
    totalPriceDzd,
  };
}

const HUMAN_ESCALATION_REGEX =
  /تفاوض|آخر\s?prix|اخر\s?prix|نحب نهدر|خليني مع المول|عطيني رقمك|تنقصلي|كاين\s?remise|نقدر نفاوض|سعر أقل|تخفيض|خصم|ريمايز|البائع شخصيا|شخص حقيقي|موظف|négoci|rabais|remise|dernier prix|moins cher|vendeur|humain|negotiat|discount|last price|cheaper|human agent|talk to seller/i;

const PURCHASE_INTENT_REGEX =
  /احجز|اطلب|أريد شراء|نحب نشري|نشريه|commander|réserver|acheter|je veux l'acheter|order it|i want to buy|reserve/i;

export function detectHumanEscalationIntent(text: string): boolean {
  return HUMAN_ESCALATION_REGEX.test(text);
}

export function detectPurchaseIntent(text: string): boolean {
  return PURCHASE_INTENT_REGEX.test(text);
}

export function formatPhoneForTelegramDisplay(e164: string): string {
  return e164.replace(/(\+213)(\d{2})(\d{3})(\d{4})/, "$1 $2 $3 $4");
}
