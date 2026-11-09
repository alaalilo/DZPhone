import type { OrderStatus } from '@/lib/store';

export const ST: Record<OrderStatus, [string, string]> = {
  pending_phone_confirmation: [
    'بانتظار التأكيد الهاتفي',
    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  ],
  confirmed_by_call: [
    'تم التأكيد هاتفياً',
    'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  ],
  shipped: [
    'تم الشحن للولاية',
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
  ],
  delivered: [
    'تم التسليم والتحصيل',
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  ],
  cancelled: [
    'ملغي (أُعيد للمخزون)',
    'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  ],
};

export const ACT: [OrderStatus, string][] = [
  ['confirmed_by_call', '✅ تأكيد هاتفياً'],
  ['shipped', '🚚 تم الشحن'],
  ['delivered', '📦 تم التسليم'],
  ['cancelled', '✖ إلغاء الطلب'],
];

export const numInput =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs tabular-nums text-slate-900 outline-none focus:border-[#2563EB] dark:border-slate-700 dark:bg-slate-900 dark:text-white';
export const dz = (n: number) => `${n.toLocaleString('fr-FR')} دج`;
