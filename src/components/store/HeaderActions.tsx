"use client";

import Link from "next/link";
import { BasketIcon, HeartIcon, UserIcon } from "@/components/icons";
import { useCartCount } from "@/lib/client/cart-store";
import { cartDrawer } from "@/lib/client/ui-events";
import { useWishlist } from "@/lib/client/wishlist-store";

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 min-w-[1.15rem] rounded-full bg-gold-500 px-1 text-center text-[0.68rem] font-bold leading-[1.15rem] text-forest-950 tabular">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function HeaderActions() {
  const count = useCartCount();
  const saved = useWishlist().length;
  const item = "relative inline-flex h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded px-1.5 text-forest-900 hover:bg-cream-100";
  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <Link href="/account" className={`${item} hidden sm:inline-flex`}>
        <UserIcon size={22} />
        <span className="hidden text-[0.7rem] font-medium lg:block">Account</span>
      </Link>
      <Link href="/wishlist" className={`${item} hidden sm:inline-flex`} aria-label={`Wishlist, ${saved} saved`}>
        <span className="relative"><HeartIcon size={22} /><Badge n={saved} /></span>
        <span className="hidden text-[0.7rem] font-medium lg:block">Wishlist</span>
      </Link>
      <button type="button" onClick={() => cartDrawer.open()} className={item} aria-label={`Cart, ${count} items`}>
        <span className="relative"><BasketIcon size={23} /><Badge n={count} /></span>
        <span className="hidden text-[0.7rem] font-medium lg:block">Cart</span>
      </button>
    </div>
  );
}
