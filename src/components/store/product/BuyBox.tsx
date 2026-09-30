"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, PhoneIcon } from "@/components/icons";
import { PriceTag } from "@/components/store/Price";
import { QuantityStepper } from "@/components/store/QuantityStepper";
import { StockNote } from "@/components/store/StockNote";
import { WishlistButton } from "@/components/store/WishlistButton";
import { cart } from "@/lib/client/cart-store";
import { cartDrawer } from "@/lib/client/ui-events";
import type { ProductDetail } from "@/lib/storefront/types";

export function BuyBox({ product, phone, phoneHref }: {
  product: ProductDetail;
  phone: string | null;
  phoneHref: string | null;
}) {
  const variants = product.variants;
  const initial = variants.find((v) => v.purchasable) ?? variants[0];
  const [variantId, setVariantId] = useState(initial?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const variant = variants.find((v) => v.id === variantId) ?? initial;

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e!.isIntersecting && e!.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!variant) return null;
  const variable = product.pricing_type === "variable";
  const showPicker = variants.length > 1 || variant.name !== "Standard";

  const add = () => {
    if (!variant.purchasable) return;
    cart.add(variant.id, qty);
    setAdded(true);
    cartDrawer.open();
    window.setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <PriceTag priceCents={variant.price_cents} regularCents={variant.regular_price_cents} variable={variable} size="lg" />
        <StockNote status={variant.stock_status} />
      </div>
      {variant.on_sale && variant.sale_ends_at && (
        <p className="mt-2 text-sm text-clay-600">
          Sale ends {new Date(variant.sale_ends_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </p>
      )}

      {showPicker && (
        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-semibold text-ink-900">Size / option</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const selected = v.id === variant.id;
              return (
                <label
                  key={v.id}
                  className={`relative flex min-h-12 cursor-pointer flex-col justify-center rounded border-[1.5px] px-4 py-2 transition-colors ${
                    selected ? "border-forest-800 bg-forest-50" : "border-cream-300 bg-white hover:border-forest-700"
                  } ${v.stock_status === "out_of_stock" ? "opacity-60" : ""}`}
                >
                  <input type="radio" name="variant" value={v.id} checked={selected} onChange={() => { setVariantId(v.id); setQty(1); }} className="sr-only" />
                  <span className="text-[0.95rem] font-semibold">{v.name}</span>
                  <span className="text-xs text-ink-500 tabular">
                    {v.price_cents != null ? `$${(v.price_cents / 100).toFixed(2)}` : "Price varies"}
                    {v.stock_status === "out_of_stock" && " · Sold out"}
                  </span>
                  {selected && <CheckIcon size={14} className="absolute right-1.5 top-1.5 text-forest-700" />}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {variant.purchasable ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <QuantityStepper value={qty} onChange={setQty} label="Quantity" />
          <button ref={buttonRef} type="button" onClick={add} className="btn btn-primary h-11 flex-1 sm:flex-none sm:px-10">
            {added ? <><CheckIcon size={18} /> Added to cart</> : "Add to cart"}
          </button>
          <WishlistButton productId={product.id} productName={product.name} className="border-[1.5px] border-cream-300 bg-white !rounded" />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <button ref={buttonRef} type="button" disabled className="btn btn-primary h-11 w-full sm:w-auto sm:px-10">
            {variable ? "Not available online" : "Sold out"}
          </button>
          <p className="text-sm text-ink-700">
            {variable
              ? "This item is priced at the counter, so it can't be ordered online yet."
              : "This option is sold out right now."}
            {phone && phoneHref && (
              <> Call <a href={phoneHref} className="inline-flex items-center gap-1 font-semibold text-forest-800 underline underline-offset-2"><PhoneIcon size={13} />{phone}</a> to ask about availability.</>
            )}
          </p>
        </div>
      )}

      {/* Mobile: keep the purchase action reachable after scrolling past it */}
      {variant.purchasable && (
        <div className={`fixed inset-x-0 bottom-0 z-20 border-t border-cream-200 bg-cream-50/95 p-3 backdrop-blur transition-transform lg:hidden ${showSticky ? "translate-y-0" : "invisible translate-y-full"}`} aria-hidden={!showSticky}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{product.name}{showPicker && ` · ${variant.name}`}</p>
              <p className="text-sm font-bold tabular">{variant.price_cents != null && `$${(variant.price_cents / 100).toFixed(2)}`}</p>
            </div>
            <button type="button" onClick={add} tabIndex={showSticky ? 0 : -1} className="btn btn-primary">{added ? "Added" : "Add to cart"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
