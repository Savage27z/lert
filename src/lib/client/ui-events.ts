"use client";
// Lightweight event bus for opening the cart drawer from anywhere.
const target = typeof window !== "undefined" ? new EventTarget() : null;

export const cartDrawer = {
  open() {
    target?.dispatchEvent(new Event("open"));
  },
  onOpen(fn: () => void) {
    target?.addEventListener("open", fn);
    return () => target?.removeEventListener("open", fn);
  },
};
