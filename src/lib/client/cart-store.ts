"use client";
import { createLocalStore } from "./local-store";

export interface CartItem {
  variant_id: string;
  quantity: number;
}

export const MAX_LINE_QUANTITY = 99;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMPTY: CartItem[] = [];

function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return EMPTY;
  return raw
    .filter((i): i is CartItem => !!i && typeof i.variant_id === "string" && UUID.test(i.variant_id))
    .map((i) => ({ variant_id: i.variant_id, quantity: clamp(Number(i.quantity)) }))
    .filter((i) => i.quantity > 0)
    .slice(0, 100);
}

function clamp(n: number) {
  return Number.isFinite(n) ? Math.min(MAX_LINE_QUANTITY, Math.max(0, Math.floor(n))) : 0;
}

const store = createLocalStore<CartItem[]>("adisah.cart.v1", EMPTY, sanitize);

export const useCartItems = store.useValue;

export function useCartCount() {
  return store.useValue().reduce((sum, i) => sum + i.quantity, 0);
}

export const cart = {
  add(variantId: string, quantity = 1) {
    const items = store.read();
    const existing = items.find((i) => i.variant_id === variantId);
    store.write(
      existing
        ? items.map((i) => (i.variant_id === variantId ? { ...i, quantity: clamp(i.quantity + quantity) } : i))
        : [...items, { variant_id: variantId, quantity: clamp(quantity) }],
    );
  },
  setQuantity(variantId: string, quantity: number) {
    const q = clamp(quantity);
    store.write(
      q === 0
        ? store.read().filter((i) => i.variant_id !== variantId)
        : store.read().map((i) => (i.variant_id === variantId ? { ...i, quantity: q } : i)),
    );
  },
  remove(variantId: string) {
    store.write(store.read().filter((i) => i.variant_id !== variantId));
  },
  clear() {
    store.write(EMPTY);
  },
};
