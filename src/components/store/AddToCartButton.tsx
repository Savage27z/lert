"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { cart } from "@/lib/client/cart-store";
import { cartDrawer } from "@/lib/client/ui-events";

export function QuickAddButton({
  variantId,
  productSlug,
  productName,
  purchasable,
  variantCount,
}: {
  variantId: string | null;
  productSlug: string;
  productName: string;
  purchasable: boolean;
  variantCount: number;
}) {
  const [added, setAdded] = useState(false);

  if (!purchasable) {
    return (
      <span className="inline-flex h-10 items-center rounded px-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
        Unavailable
      </span>
    );
  }

  if (!variantId) {
    return (
      <Link
        href={`/product/${productSlug}`}
        className="relative z-10 inline-flex h-10 items-center rounded border-[1.5px] border-forest-800 px-3 text-sm font-semibold text-forest-800 hover:bg-forest-50"
        aria-label={`Choose one of ${variantCount} sizes for ${productName}`}
      >
        Choose
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        cart.add(variantId, 1);
        setAdded(true);
        cartDrawer.open();
        window.setTimeout(() => setAdded(false), 1600);
      }}
      className="relative z-10 inline-flex h-10 items-center gap-1.5 rounded bg-forest-800 pl-2.5 pr-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-forest-900"
      aria-label={`Add ${productName} to cart`}
    >
      {added ? <CheckIcon size={18} /> : <PlusIcon size={18} />}
      <span>{added ? "Added" : "Add"}</span>
    </button>
  );
}
