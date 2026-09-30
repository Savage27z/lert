"use client";
import { useSyncExternalStore } from "react";

/**
 * Tiny persisted store backed by localStorage, shared across tabs.
 * Only non-authoritative data lives here (e.g. which variants are in the cart);
 * prices and availability are always fetched from the server.
 */
export function createLocalStore<T>(key: string, fallback: T, sanitize: (raw: unknown) => T) {
  let cache: T = fallback;
  let loaded = false;
  const listeners = new Set<() => void>();

  function read(): T {
    if (typeof window === "undefined") return fallback;
    if (!loaded) {
      loaded = true;
      try {
        const raw = window.localStorage.getItem(key);
        cache = raw ? sanitize(JSON.parse(raw)) : fallback;
      } catch {
        cache = fallback;
      }
    }
    return cache;
  }

  function write(next: T) {
    cache = next;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage full or disabled: keep in-memory state for this tab
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        loaded = false;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, read, () => fallback);
  }

  return { read, write, useValue };
}
