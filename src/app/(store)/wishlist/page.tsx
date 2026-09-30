"use client";

import { ProductGrid } from "@/components/store/ProductCard";
import { WishlistView } from "@/components/store/WishlistView";

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
      <p className="kicker">Saved for later</p>
      <h1 className="mb-8 mt-1.5 font-display text-3xl text-forest-900 sm:text-4xl">Wishlist</h1>
      <WishlistView renderGrid={(cards) => <ProductGrid products={cards} />} />
    </div>
  );
}
