import type { Metadata } from "next";
import { PhoneIcon, StoreIcon } from "@/components/icons";
import { formatUsPhone, telHref } from "@/lib/phone";
import { getStoreSettings } from "@/lib/storefront/queries";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const s = await getStoreSettings();
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 sm:pt-14">
      <p className="kicker">Get in touch</p>
      <h1 className="mt-2 font-display text-4xl text-forest-900 sm:text-5xl">Contact ADISAH</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-700">Questions about a product, a size, or an order? We&apos;re happy to help.</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {s.contact_phone && (
          <a href={telHref(s.contact_phone)} className="group rounded-[var(--radius-card)] border border-cream-200 bg-white p-6 transition-colors hover:border-forest-700">
            <PhoneIcon size={26} className="text-gold-600" />
            <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-ink-500">Call us</h2>
            <p className="mt-1 font-display text-3xl text-forest-900 group-hover:underline">{formatUsPhone(s.contact_phone)}</p>
          </a>
        )}
        {s.contact_email && (
          <a href={`mailto:${s.contact_email}`} className="rounded-[var(--radius-card)] border border-cream-200 bg-white p-6 hover:border-forest-700">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-500">Email</h2>
            <p className="mt-1 text-xl font-semibold text-forest-900">{s.contact_email}</p>
          </a>
        )}
        <div className="rounded-[var(--radius-card)] border border-cream-200 bg-white p-6">
          <StoreIcon size={26} className="text-gold-600" />
          <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-ink-500">Visit the store</h2>
          {s.store_address ? (
            <address className="mt-1 not-italic text-lg text-forest-900">
              {s.store_address.line1}<br />
              {s.store_address.line2 && <>{s.store_address.line2}<br /></>}
              {s.store_address.city}, {s.store_address.state} {s.store_address.postal_code}
            </address>
          ) : (
            <p className="mt-1 text-ink-700">Store address and opening hours will be listed here soon. Call us for directions.</p>
          )}
          {s.store_hours && s.store_hours.length > 0 && (
            <dl className="mt-4 space-y-1 text-sm">
              {s.store_hours.map((h) => (
                <div key={h.days} className="flex justify-between gap-4"><dt className="text-ink-500">{h.days}</dt><dd className="tabular">{h.opens} – {h.closes}</dd></div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
