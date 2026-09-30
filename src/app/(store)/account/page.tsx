import type { Metadata } from "next";
import Link from "next/link";
import { UserIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-xl px-4 pt-10 text-center sm:pt-16">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-forest-700"><UserIcon size={28} /></span>
      <h1 className="mt-5 font-display text-3xl text-forest-900">Customer accounts are coming</h1>
      <p className="mt-3 text-ink-700">
        Accounts — with saved addresses and order history — open together with online checkout.
        You can already browse, build your cart and save items to your wishlist on this device.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn btn-primary">Keep shopping</Link>
        <Link href="/wishlist" className="btn btn-outline">View wishlist</Link>
      </div>
    </div>
  );
}
