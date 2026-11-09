import { useSyncExternalStore } from 'react';
import SEED from '@/data/wilayas-69.seed.json';
import { PRODUCTS, type Product } from '@/data/products';

export type Wilaya = {
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  home_delivery_price: number;
  stop_desk_price: number;
  is_active: boolean;
  parent_wilaya_code?: string | null;
};

export type OrderStatus =
  | 'pending_phone_confirmation'
  | 'confirmed_by_call'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type ShippingMethod = 'home_delivery' | 'stop_desk';
export type PurchaseMethod = 'direct_checkout' | 'in_site_chat' | 'social_media';

export type Order = {
  id: string;
  order_number?: string;
  created_at: string;
  confirmed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  customer_full_name: string;
  customer_phone: string;
  wilaya_code: string;
  commune: string;
  delivery_address: string;
  shipping_method: ShippingMethod;
  purchase_method: PurchaseMethod;
  chat_session_id: string | null;
  customer_note?: string;
  admin_note?: string;
  items: {
    product_id: string;
    name: string;
    price_dzd: number;
    quantity: number;
  }[];
  items_subtotal_dzd: number;
  discount_dzd: number;
  shipping_price_dzd: number;
  total_price_dzd: number;
  status: OrderStatus;
};

export type ChatMessage = {
  id: string;
  sender: 'customer' | 'assistant' | 'human_agent' | 'system';
  content: string;
  created_at: string;
};

export type ChatSession = {
  id: string;
  product_id: string;
  locale: 'ar' | 'fr' | 'en';
  status: 'open' | 'waiting_for_human' | 'closed';
  needs_human_agent: boolean;
  checkout_unlocked: boolean;
  checkout_discount_dzd: number;
  messages: ChatMessage[];
};

export type Settings = {
  whatsapp: string;
  instagram: string;
  messenger: string;
};

export type OutboxSummary = {
  id: string;
  event_type: string;
  status: string;
  attempts: number;
  created_at: string;
  sent_at?: string | null;
  last_error?: string | null;
};

export type CartItem = {
  product_id: string;
  quantity: number;
};

function loadInitialCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('dzphone_cart_v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('dzphone_cart_v1', JSON.stringify(cart));
  } catch {
    // ignore storage quota errors
  }
}

type State = {
  products: Product[];
  adminProducts: Product[];
  wilayas: Wilaya[];
  orders: Order[];
  sessions: ChatSession[];
  settings: Settings;
  outbox: OutboxSummary[];
  cart: CartItem[];
  adminAuthenticated: boolean;
  adminEmail: string | null;
  telegramConfigured: boolean;
  passwordConfigured: boolean;
  previewAuthEnabled: boolean;
};

let state: State = {
  products: PRODUCTS,
  adminProducts: PRODUCTS,
  wilayas: SEED as Wilaya[],
  orders: [],
  sessions: [],
  settings: {
    whatsapp: '',
    instagram: 'dzphone',
    messenger: 'dzphone',
  },
  outbox: [],
  cart: loadInitialCart(),
  adminAuthenticated: false,
  adminEmail: null,
  telegramConfigured: false,
  passwordConfigured: false,
  previewAuthEnabled: true,
};

const subs = new Set<() => void>();
export const getState = () => state;
export const setState = (fn: (s: State) => Partial<State>) => {
  const patch = fn(state);
  state = { ...state, ...patch };
  if (patch.cart !== undefined) {
    saveCart(state.cart);
  }
  subs.forEach((f) => f());
};

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => sel(state)
  );
}

export function addToCart(productId: string, qty = 1) {
  setState((s) => {
    const prod = s.products.find((p) => p.id === productId);
    const maxStock = prod?.stock_quantity ?? 0;
    const existing = s.cart.find((c) => c.product_id === productId);
    if (!prod || maxStock <= 0) return { cart: s.cart };
    if (existing) {
      const nextQty = Math.min(maxStock, existing.quantity + qty);
      return {
        cart: s.cart.map((c) =>
          c.product_id === productId ? { ...c, quantity: nextQty } : c
        ),
      };
    }
    return {
      cart: [...s.cart, { product_id: productId, quantity: Math.min(maxStock, qty) }],
    };
  });
}

export function updateCartQty(productId: string, quantity: number) {
  setState((s) => {
    if (quantity <= 0) {
      return { cart: s.cart.filter((c) => c.product_id !== productId) };
    }
    const prod = s.products.find((p) => p.id === productId);
    const maxStock = prod?.stock_quantity ?? 0;
    if (!prod || maxStock <= 0) {
      return { cart: s.cart.filter((c) => c.product_id !== productId) };
    }
    return {
      cart: s.cart.map((c) =>
        c.product_id === productId
          ? { ...c, quantity: Math.min(maxStock, Math.floor(quantity)) }
          : c
      ),
    };
  });
}

export function removeFromCart(productId: string) {
  setState((s) => ({
    cart: s.cart.filter((c) => c.product_id !== productId),
  }));
}

export function clearCart() {
  setState(() => ({ cart: [] }));
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending_phone_confirmation: ['confirmed_by_call', 'cancelled'],
  confirmed_by_call: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};
