import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { formatUsPhone, telHref } from "@/lib/phone";
import type { CategorySummary, StoreSettings } from "@/lib/storefront/types";
import { NewsletterForm } from "./NewsletterForm";

export function Footer({ settings, categories }: { settings: StoreSettings; categories: CategorySummary[] }) {
  const phone = settings.contact_phone;
  const col = "text-sm text-cream-200/85 hover:text-cream-50";
  return (
    <footer className="mt-20 bg-forest-900 text-cream-100">
      <div className="selvedge" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-6 border-b border-forest-700 pb-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-2xl text-cream-50 sm:text-3xl">Specials and new arrivals</h2>
            <p className="mt-1 text-sm text-cream-200/80">Occasional emails when something good lands on the shelf.</p>
          </div>
          <NewsletterForm />
        </div>

        <div className="grid grid-cols-2 gap-8 pt-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo tone="light" />
            {phone && (
              <p className="mt-5 text-sm">
                <span className="block text-cream-200/70">Questions or orders</span>
                <a href={telHref(phone)} className="text-lg font-semibold text-gold-400 hover:underline">{formatUsPhone(phone)}</a>
              </p>
            )}
          </div>
          <div>
            <h3 className="kicker !text-gold-400">Shop</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/shop" className={col}>All products</Link></li>
              <li><Link href="/specials" className={col}>Specials</Link></li>
              {categories.slice(0, 5).map((c) => (
                <li key={c.slug}><Link href={`/categories/${c.slug}`} className={col}>{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="kicker !text-gold-400">Help</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/contact" className={col}>Contact us</Link></li>
              <li><Link href="/about" className={col}>About ADISAH</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="kicker !text-gold-400">My account</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/account" className={col}>Account</Link></li>
              <li><Link href="/wishlist" className={col}>Wishlist</Link></li>
              <li><Link href="/cart" className={col}>Cart</Link></li>
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-forest-700 pt-6 text-xs text-cream-200/60">
          © {new Date().getFullYear()} {settings.business_name}. Prices shown online are current and may change.
        </p>
      </div>
    </footer>
  );
}
