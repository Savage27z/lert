"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { priceCart } from "@/app/(store)/actions";
import { AlertIcon, BasketIcon, PhoneIcon, TrashIcon } from "@/components/icons";
import { cart, useCartItems } from "@/lib/client/cart-store";
import { formatCents } from "@/lib/money";
import type { PricedCart } from "@/lib/storefront/types";
import { ProductImage } from "./ProductImage";
import { QuantityStepper } from "./QuantityStepper";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; cart: PricedCart };

const LINE_MESSAGES = {
  unavailable: "No longer available online — please remove it.",
  quantity_adjusted: "Only a limited quantity is available; we adjusted it.",
} as const;

/** Cart contents, priced by the server on every change. */
export function CartView({ variant = "page", phone, phoneHref, onNavigate }: {
  variant?: "page" | "drawer";
  phone: string | null;
  phoneHref: string | null;
  onNavigate?: () => void;
}) {
  const items = useCartItems();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const result = await priceCart(items);
      if (cancelled) return;
      setState("error" in result ? { kind: "error", message: result.error } : { kind: "ready", cart: result });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [items]);

  // Keep stored quantities in line with what the server allows.
  useEffect(() => {
    if (state.kind !== "ready") return;
    for (const line of state.cart.lines) {
      if (line.status === "quantity_adjusted") cart.setQuantity(line.variant_id, line.quantity);
    }
  }, [state]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-forest-700">
          <BasketIcon size={30} />
        </span>
        <h2 className="mt-5 font-display text-2xl text-forest-900">Your cart is empty</h2>
        <p className="mt-2 max-w-xs text-sm text-ink-500">Browse the aisles and add your favourites — they&apos;ll wait here.</p>
        <Link href="/shop" onClick={onNavigate} className="btn btn-primary mt-6">Start shopping</Link>
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <ul className="space-y-4 p-4" aria-busy="true" aria-label="Loading cart">
        {items.map((i) => (
          <li key={i.variant_id} className="flex gap-3">
            <div className="h-20 w-20 animate-pulse rounded bg-cream-100" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-2/3 animate-pulse rounded bg-cream-100" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-cream-100" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (state.kind === "error") {
    return (
      <div role="alert" className="m-4 flex gap-3 rounded border border-clay-600/30 bg-clay-100 p-4 text-sm text-ink-900">
        <AlertIcon size={20} className="shrink-0 text-clay-600" /> {state.message}
      </div>
    );
  }

  const { lines, subtotal_cents, item_count } = state.cart;

  return (
    <div className={variant === "page" ? "grid gap-8 lg:grid-cols-[1fr_22rem]" : "flex min-h-0 flex-1 flex-col"}>
      <ul className={`divide-y divide-cream-200 ${variant === "drawer" ? "flex-1 overflow-y-auto px-4" : ""}`}>
        {lines.map((line) => {
          const problem = line.status === "unavailable" || line.status === "quantity_adjusted" ? LINE_MESSAGES[line.status] : null;
          return (
            <li key={line.variant_id} className="flex gap-3 py-4 sm:gap-4">
              <Link href={`/product/${line.product_slug}`} onClick={onNavigate} className="relative h-20 w-20 shrink-0 overflow-hidden rounded border border-cream-200 bg-cream-50 sm:h-24 sm:w-24">
                <ProductImage image={line.image} name={line.product_name} sizes="96px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/product/${line.product_slug}`} onClick={onNavigate} className="font-medium leading-snug text-ink-900 hover:text-forest-800">
                      {line.product_name}
                    </Link>
                    {line.variant_name && <p className="text-sm text-ink-500">{line.variant_name}</p>}
                    {line.unit_price_cents != null && (
                      <p className="mt-0.5 text-sm text-ink-500 tabular">
                        {formatCents(line.unit_price_cents)} each
                        {line.regular_unit_price_cents != null && line.unit_price_cents < line.regular_unit_price_cents && (
                          <s className="ml-1.5 text-ink-400">{formatCents(line.regular_unit_price_cents)}</s>
                        )}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-semibold tabular">{line.status === "unavailable" ? "—" : formatCents(line.line_total_cents)}</p>
                </div>
                {problem && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-clay-600"><AlertIcon size={14} className="mt-px shrink-0" />{problem}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-2">
                  {line.status !== "unavailable" ? (
                    <QuantityStepper size="sm" value={line.quantity} onChange={(n) => cart.setQuantity(line.variant_id, n)} label={`Quantity for ${line.product_name}`} />
                  ) : <span />}
                  <button type="button" onClick={() => cart.remove(line.variant_id)} className="inline-flex h-9 items-center gap-1.5 rounded px-2 text-sm text-ink-500 hover:bg-cream-100 hover:text-clay-600">
                    <TrashIcon size={16} /> Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section aria-label="Order summary" className={variant === "page" ? "h-fit rounded-[var(--radius-card)] border border-cream-200 bg-white p-5 lg:sticky lg:top-24" : "border-t border-cream-200 bg-white p-4"}>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-ink-500">Items</dt><dd className="tabular">{item_count}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Subtotal</dt><dd className="tabular">{formatCents(subtotal_cents)}</dd></div>
        </dl>
        <p className="mt-1 text-xs text-ink-500">Taxes and any delivery fees are calculated at checkout.</p>
        <button type="button" className="btn btn-primary mt-4 w-full" disabled aria-describedby="checkout-status">
          Checkout
        </button>
        <p id="checkout-status" className="mt-3 rounded bg-gold-100 p-3 text-xs leading-relaxed text-forest-950">
          Online checkout is being set up and will open soon.
          {phone && phoneHref && (
            <> To order today, call us at{" "}
              <a href={phoneHref} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"><PhoneIcon size={12} />{phone}</a>.
            </>
          )}
        </p>
        {variant === "drawer" && (
          <Link href="/cart" onClick={onNavigate} className="btn btn-outline mt-3 w-full">View full cart</Link>
        )}
      </section>
    </div>
  );
}
