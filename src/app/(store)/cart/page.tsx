import type { Metadata } from "next";
import { CartView } from "@/components/store/CartView";
import { formatUsPhone, telHref } from "@/lib/phone";
import { getStoreSettings } from "@/lib/storefront/queries";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const settings = await getStoreSettings();
  const phone = settings.contact_phone ? formatUsPhone(settings.contact_phone) : null;
  const phoneHref = settings.contact_phone ? telHref(settings.contact_phone) : null;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <h1 className="mb-6 font-display text-3xl text-forest-900 sm:text-4xl">Your cart</h1>
      <CartView phone={phone} phoneHref={phoneHref} />
    </div>
  );
}
