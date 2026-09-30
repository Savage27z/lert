"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getWishlistCards } from "@/app/(store)/actions";
import { HeartIcon } from "@/components/icons";
import { useWishlist } from "@/lib/client/wishlist-store";
import type { ProductCard as Card } from "@/lib/storefront/types";

export function WishlistView({ renderGrid }: { renderGrid: (cards: Card[]) => React.ReactNode }) {
  const ids = useWishlist();
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWishlistCards(ids).then((c) => { if (!cancelled) setCards(c); });
    return () => { cancelled = true; };
  }, [ids]);

  if (ids.length === 0 || (cards && cards.length === 0)) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-clay-600"><HeartIcon size={28} /></span>
        <h2 className="mt-5 font-display text-2xl text-forest-900">Nothing saved yet</h2>
        <p className="mt-2 max-w-sm text-sm text-ink-500">Tap the heart on any product to keep it here for next time. Your list is saved on this device.</p>
        <Link href="/shop" className="btn btn-primary mt-6">Browse products</Link>
      </div>
    );
  }
  if (!cards) return <p className="py-10 text-center text-sm text-ink-500" aria-busy="true">Loading your saved items…</p>;
  return <>{renderGrid(cards)}</>;
}
