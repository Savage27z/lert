"use client";

import { HeartIcon } from "@/components/icons";
import { useWishlist, wishlist } from "@/lib/client/wishlist-store";

export function WishlistButton({ productId, productName, className = "" }: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const saved = useWishlist().includes(productId);
  return (
    <button
      type="button"
      onClick={() => wishlist.toggle(productId)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      className={`relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
        saved ? "text-clay-600" : "text-ink-500 hover:text-clay-600"
      } ${className}`}
    >
      <HeartIcon filled={saved} size={20} />
    </button>
  );
}
