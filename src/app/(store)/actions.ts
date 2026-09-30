"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import type { PricedCart, ProductCard } from "@/lib/storefront/types";

const cartSchema = z
  .array(z.object({ variant_id: z.uuid(), quantity: z.number().int().min(0).max(99) }))
  .max(100);

/** Prices the cart on the server. Only ids and quantities are accepted. */
export async function priceCart(items: unknown): Promise<PricedCart | { error: string }> {
  const parsed = cartSchema.safeParse(items);
  if (!parsed.success) return { error: "Your cart could not be read. Please refresh the page." };
  if (parsed.data.length === 0) return { lines: [], subtotal_cents: 0, item_count: 0, has_issues: false };

  const { data, error } = await createPublicClient().rpc("storefront_price_cart", { p_items: parsed.data });
  if (error) {
    console.error("[cart] pricing failed", error.message);
    return { error: "We couldn't load current prices. Please try again in a moment." };
  }
  return data as PricedCart;
}

export async function getWishlistCards(ids: unknown): Promise<ProductCard[]> {
  const parsed = z.array(z.uuid()).max(100).safeParse(ids);
  if (!parsed.success || parsed.data.length === 0) return [];
  const { data, error } = await createPublicClient().rpc("storefront_cards", { p_ids: parsed.data });
  if (error) {
    console.error("[wishlist] load failed", error.message);
    return [];
  }
  return data as ProductCard[];
}

export type NewsletterState = { status: "idle" | "success" | "error"; message?: string };

export async function subscribeToNewsletter(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  // Honeypot field: real visitors never fill it in.
  if (formData.get("company")) return { status: "success", message: "Thanks — you're on the list." };

  const email = z.email().max(254).safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) return { status: "error", message: "Please enter a valid email address." };

  if (!rateLimit(`newsletter:${await clientIp()}`, 5, 10 * 60_000)) {
    return { status: "error", message: "Too many attempts. Please try again in a few minutes." };
  }

  const { data, error } = await createPublicClient().rpc("subscribe_newsletter", {
    p_email: email.data,
    p_source: "website_footer",
  });
  if (error || !(data as { ok: boolean }).ok) {
    if (error) console.error("[newsletter] subscribe failed", error.message);
    return { status: "error", message: "We couldn't save your email. Please try again." };
  }
  return { status: "success", message: "Thanks — you're on the list for specials and new arrivals." };
}
