import type { Product, ProductAvailability, ProductImageItem } from '@/data/products';
import { Lang, wName } from './i18n';
import { getAdminToken, getVisitorToken, setAdminToken } from './auth';
import {
  ALLOWED,
  ChatMessage,
  ChatSession,
  Order,
  OrderStatus,
  OutboxSummary,
  PurchaseMethod,
  Settings,
  ShippingMethod,
  Wilaya,
  getState,
  setState,
  uid,
} from './store';

const buildHeaders = (): Record<string, string> => {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Visitor-Token': getVisitorToken(),
  };
  const token = getAdminToken();
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
  }
  return h;
};

const j = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const r = await fetch(url, {
    credentials: 'include',
    headers: {
      ...buildHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
    signal: AbortSignal.timeout(12000),
    ...init,
  });
  if (!r.ok) {
    const errBody = await r.json().catch(() => ({}));
    throw new Error(errBody?.error || `${r.status}`);
  }
  return r.json();
};

const body = (b: object, method = 'POST'): RequestInit => ({
  method,
  body: JSON.stringify(b),
});
const now = () => new Date().toISOString();
const msg = (sender: ChatMessage['sender'], content: string): ChatMessage => ({
  id: uid(),
  sender,
  content,
  created_at: now(),
});
const upd = (id: string, fn: (s: ChatSession) => Partial<ChatSession>) =>
  setState((s) => ({
    sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...fn(x) } : x)),
  }));

// ---------- Public Storefront APIs ----------
export async function getProducts(): Promise<Product[]> {
  try {
    const p = await j<Product[]>('/api/products');
    setState(() => ({ products: p }));
    return p;
  } catch {
    return getState().products;
  }
}

export async function getWilayas(): Promise<Wilaya[]> {
  try {
    const w = await j<Wilaya[]>('/api/shipping/wilayas');
    setState(() => ({ wilayas: w }));
    return w;
  } catch {
    return getState().wilayas;
  }
}

export async function getStoreSettings(): Promise<Settings> {
  try {
    const s = await j<Settings>('/api/settings');
    setState(() => ({ settings: s }));
    return s;
  } catch {
    return getState().settings;
  }
}

export type OrderInput = {
  customer_full_name: string;
  customer_phone: string;
  wilaya_code: string;
  commune: string;
  delivery_address: string;
  shipping_method: ShippingMethod;
  purchase_method: PurchaseMethod;
  chat_session_id: string | null;
  items: { product_id: string; quantity: number }[];
  customer_note?: string;
};

export async function createOrder(
  input: OrderInput,
  _discount = 0
): Promise<Order> {
  // An order is successful only after the backend/database confirms it.
  // Never create a local pseudo-order when the API is unreachable.
  const o = await j<Order>('/api/orders', body(input));
  void getProducts();
  setState((s) => ({
    orders: [o, ...s.orders.filter((x) => x.id !== o.id)],
  }));
  return o;
}

export async function trackOrder(
  order_number: string,
  customer_phone: string
): Promise<{ status: OrderStatus; created_at: string }> {
  return j<{ status: OrderStatus; created_at: string }>(
    '/api/orders/track',
    body({ order_number, customer_phone })
  );
}

export async function createChatSession(
  product_id: string,
  locale: Lang
): Promise<ChatSession> {
  const c = await j<ChatSession>(
    '/api/chat/sessions',
    body({ product_id, locale })
  );
  setState((s) => ({
    sessions: [c, ...s.sessions.filter((x) => x.id !== c.id)],
  }));
  return c;
}

export async function getChatMessages(id: string): Promise<ChatSession | null> {
  try {
    const r = await j<{ session: ChatSession }>(
      `/api/chat/sessions/${id}/messages`
    );
    setState((s) => ({
      sessions: s.sessions.some((x) => x.id === id)
        ? s.sessions.map((x) => (x.id === id ? r.session : x))
        : [r.session, ...s.sessions],
    }));
    return r.session;
  } catch {
    return getState().sessions.find((x) => x.id === id) ?? null;
  }
}

export async function sendChatMessage(
  id: string,
  content: string,
  intent?: 'request_human'
): Promise<void> {
  const optimisticMessage = msg('customer', content);
  upd(id, (x) => ({ messages: [...x.messages, optimisticMessage] }));
  try {
    const r = await j<{ session: ChatSession }>(
      `/api/chat/sessions/${id}/messages`,
      body({ content, intent })
    );
    setState((s) => ({
      sessions: s.sessions.map((x) => (x.id === id ? r.session : x)),
    }));
  } catch (error) {
    // Remove the optimistic message so the UI never implies it reached the seller/AI.
    upd(id, (x) => ({
      messages: x.messages.filter((m) => m.id !== optimisticMessage.id),
    }));
    throw error;
  }
}

export async function uploadProductImage(file: File): Promise<ProductImageItem> {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowed.has(file.type)) {
    throw new Error('صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.');
  }
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
    throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميغابايت.');
  }
  const headers = buildHeaders();
  headers['Content-Type'] = file.type;
  const response = await fetch('/api/admin/uploads/images', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: file,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || `Image upload failed (${response.status})`);
  }
  return response.json() as Promise<ProductImageItem>;
}

// ---------- Admin Authentication & Control Center APIs ----------
export async function getAdminAuthConfig(): Promise<void> {
  try {
    const cfg = await j<{
      passwordConfigured: boolean;
      previewAuthEnabled: boolean;
      telegramConfigured: boolean;
    }>('/api/admin/auth-config');
    setState(() => ({
      passwordConfigured: cfg.passwordConfigured,
      previewAuthEnabled: cfg.previewAuthEnabled,
      telegramConfigured: cfg.telegramConfigured,
    }));
  } catch {
    // ignore
  }
}

export async function adminLoginWithPassword(password: string): Promise<boolean> {
  const res = await j<{ token: string; email: string }>(
    '/api/admin/login',
    body({ password })
  );
  setAdminToken(res.token, res.email);
  await fetchAdminBootstrap();
  return true;
}

export async function adminLoginPreviewSession(): Promise<boolean> {
  const res = await j<{ token: string; email: string }>(
    '/api/admin/preview-session',
    body({})
  );
  setAdminToken(res.token, res.email);
  await fetchAdminBootstrap();
  return true;
}

export async function fetchAdminBootstrap(): Promise<void> {
  try {
    const [orders, chats, wilayas, adminProducts, outboxRes] = await Promise.all([
      j<Order[]>('/api/admin/orders'),
      j<ChatSession[]>('/api/admin/chats'),
      j<Wilaya[]>('/api/admin/wilayas'),
      j<Product[]>('/api/admin/products'),
      j<{ outbox: OutboxSummary[]; telegramConfigured: boolean }>(
        '/api/admin/outbox'
      ),
    ]);
    setState(() => ({
      orders,
      sessions: chats,
      wilayas,
      adminProducts,
      products: adminProducts.filter(
        (p) => p.availability !== 'hidden' && p.availability !== 'draft'
      ),
      outbox: outboxRes.outbox,
      telegramConfigured: outboxRes.telegramConfigured,
    }));
  } catch {
    // ignore if unauthenticated
  }
}

export async function adminSetOrderStatus(
  id: string,
  status: OrderStatus,
  admin_note?: string
) {
  const cur = getState().orders.find((o) => o.id === id);
  if (!cur || !ALLOWED[cur.status].includes(status)) return;
  try {
    const updated = await j<Order>(
      `/api/admin/orders/${id}/status`,
      body({ status, admin_note }, 'PATCH')
    );
    setState((s) => ({
      orders: s.orders.map((o) => (o.id === id ? updated : o)),
    }));
    // Refresh products in case cancellation restored stock
    void fetchAdminBootstrap();
    return;
  } catch {
    /* fallback */
  }
  setState((s) => ({
    orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
  }));
}

export async function adminReply(id: string, content: string) {
  try {
    const r = await j<{ session: ChatSession }>(
      `/api/admin/chats/${id}/messages`,
      body({ content })
    );
    setState((s) => ({
      sessions: s.sessions.map((x) => (x.id === id ? r.session : x)),
    }));
    return;
  } catch {
    /* fallback */
  }
  upd(id, (x) => ({ messages: [...x.messages, msg('human_agent', content)] }));
}

export async function adminUnlockCheckout(id: string, discount_dzd: number) {
  try {
    const r = await j<{ session: ChatSession }>(
      `/api/admin/chats/${id}/unlock-checkout`,
      body({ discount_dzd })
    );
    setState((s) => ({
      sessions: s.sessions.map((x) => (x.id === id ? r.session : x)),
    }));
    return;
  } catch {
    /* fallback */
  }
  upd(id, (x) => ({
    checkout_unlocked: true,
    checkout_discount_dzd: Math.max(0, Math.floor(discount_dzd) || 0),
  }));
}

export async function adminPatchWilaya(
  code: string,
  patch: Partial<
    Pick<Wilaya, 'home_delivery_price' | 'stop_desk_price' | 'is_active'>
  >
) {
  try {
    const updated = await j<Wilaya>(
      `/api/admin/wilayas/${code}`,
      body(patch, 'PATCH')
    );
    setState((s) => ({
      wilayas: s.wilayas.map((w) => (w.code === code ? updated : w)),
    }));
    return;
  } catch {
    /* fallback */
  }
  setState((s) => ({
    wilayas: s.wilayas.map((w) => (w.code === code ? { ...w, ...patch } : w)),
  }));
}

export async function adminCreateProduct(input: Partial<Product>): Promise<Product> {
  const created = await j<Product>('/api/admin/products', body(input, 'POST'));
  await fetchAdminBootstrap();
  return created;
}

export async function adminPatchProduct(
  id: string,
  patch: Partial<{
    sku: string;
    brand: string;
    commercial_name: string;
    name: { ar: string; fr: string; en: string };
    price_dzd: number;
    condition: 'new_sealed' | 'used_like_new';
    color: string;
    availability: ProductAvailability;
    stock_quantity: number;
    battery_health_percent: number;
    images: ProductImageItem[];
    specs: Product['specs'];
    inspection: Product['inspection'] | null;
    seller_personal_note: { ar: string; fr: string; en: string };
  }>
) {
  try {
    const updated = await j<Product>(
      `/api/admin/products/${id}`,
      body(patch, 'PATCH')
    );
    setState((s) => ({
      adminProducts: s.adminProducts.map((p) => (p.id === id ? updated : p)),
      products: s.products
        .map((p) => (p.id === id ? updated : p))
        .filter(
          (p) => p.availability !== 'hidden' && p.availability !== 'draft'
        ),
    }));
    return updated;
  } catch {
    return null;
  }
}

export async function adminDeleteProduct(id: string) {
  await j<{ deleted: boolean; hidden: boolean }>(`/api/admin/products/${id}`, {
    method: 'DELETE',
  });
  await fetchAdminBootstrap();
}

export async function adminSaveSettings(settings: Settings) {
  try {
    const updated = await j<Settings>(
      '/api/admin/settings',
      body(settings, 'PATCH')
    );
    setState(() => ({ settings: updated }));
    return;
  } catch {
    /* fallback */
  }
  setState(() => ({ settings }));
}

