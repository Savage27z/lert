"use client";
import { createLocalStore } from "./local-store";

// Guest wishlist (product ids) kept on this device. Signed-in wishlists will
// sync to the wishlist_items table once customer accounts ship.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMPTY: string[] = [];

const store = createLocalStore<string[]>("adisah.wishlist.v1", EMPTY, (raw) =>
  Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string" && UUID.test(x)).slice(0, 100) : EMPTY,
);

export const useWishlist = store.useValue;

export const wishlist = {
  toggle(productId: string) {
    const ids = store.read();
    store.write(ids.includes(productId) ? ids.filter((id) => id !== productId) : [productId, ...ids]);
  },
  remove(productId: string) {
    store.write(store.read().filter((id) => id !== productId));
  },
};
