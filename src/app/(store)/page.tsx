import Link from "next/link";
import { PhoneIcon } from "@/components/icons";
import { AisleNav } from "@/components/store/home/AisleNav";
import { PriceBoard } from "@/components/store/home/PriceBoard";
import { ProductGrid } from "@/components/store/ProductCard";
import { SectionHeader } from "@/components/store/SectionHeader";
import { CatalogUnavailable } from "@/components/store/States";
import { formatUsPhone, telHref } from "@/lib/phone";
import { getHome, getStoreSettings } from "@/lib/storefront/queries";
import type { HomeData } from "@/lib/storefront/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getStoreSettings();
  let home: HomeData;
  try {
    home = await getHome();
  } catch {
    return <CatalogUnavailable />;
  }
  const phone = settings.contact_phone;

  return (
    <>
      {/* Hero: what ADISAH is, and straight into real products and prices */}
      <section className="border-b border-cream-200 bg-[radial-gradient(ellipse_at_top_left,var(--color-cream-100),transparent_60%)]">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:py-14">
          <div>
            <p className="kicker">ADISAH African Store</p>
            <h1 className="mt-3 font-display text-[2.35rem] leading-[1.05] text-forest-900 sm:text-5xl lg:text-[3.6rem]">
              Authentic African groceries, <span className="text-gold-600">closer to home.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[1.05rem] leading-relaxed text-ink-700">
              Rice, beans, spices, leaves, drinks and the everyday favourites you grew up with — easy to find,
              clearly priced, and ready to order.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-primary">Shop now</Link>
              <Link href="/categories" className="btn btn-outline">Browse categories</Link>
            </div>
            {phone && (
              <a href={telHref(phone)} className="mt-6 inline-flex items-center gap-2 text-sm text-ink-700 hover:text-forest-800">
                <PhoneIcon size={16} className="text-gold-600" />
                Questions? Call <span className="font-semibold text-forest-800">{formatUsPhone(phone)}</span>
              </a>
            )}
          </div>
          <PriceBoard products={home.featured.length ? home.featured : home.popular} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 pt-10 sm:px-6 sm:pt-14">
        {home.categories.length > 0 && (
          <section aria-labelledby="aisles-title">
            <SectionHeader id="aisles-title" kicker="Shop by aisle" title="What are you cooking?" href="/categories" linkLabel="All categories" />
            <AisleNav categories={home.categories} />
          </section>
        )}

        {home.specials.length > 0 && (
          <section aria-labelledby="specials-title" className="rounded-[var(--radius-card)] bg-clay-100/60 p-4 sm:p-6">
            <SectionHeader
              id="specials-title"
              kicker={home.specials_ends_at ? `Ends ${new Date(home.specials_ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "This week"}
              title="Weekly specials"
              href="/specials"
            />
            <ProductGrid products={home.specials.slice(0, 5)} />
          </section>
        )}

        {home.popular.length > 0 && (
          <section aria-labelledby="popular-title">
            <SectionHeader
              id="popular-title"
              kicker={home.popular_source === "sales" ? "Best sellers" : "Featured"}
              title={home.popular_source === "sales" ? "What people are buying" : "Pantry favourites"}
              href="/shop"
            />
            <ProductGrid products={home.popular.slice(0, 10)} priorityCount={2} />
          </section>
        )}

        <section aria-labelledby="why-title" className="grid gap-8 border-y border-cream-200 py-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="kicker">Why ADISAH</p>
            <h2 id="why-title" className="mt-1.5 font-display text-2xl text-forest-900 sm:text-[2rem]">A grocery that knows your kitchen</h2>
          </div>
          <ul className="grid gap-6 sm:grid-cols-3">
            <li>
              <h3 className="font-semibold text-forest-900">The names you know</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-700">Milo, Peak, Golden Morn, Gino, Maggi and more — alongside leaves, spices and staples.</p>
            </li>
            <li>
              <h3 className="font-semibold text-forest-900">Clear, current prices</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-700">The price on the page is the price we charge, kept up to date by the ADISAH team.</p>
            </li>
            <li>
              <h3 className="font-semibold text-forest-900">A real person to ask</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                Not sure which size or brand?{" "}
                {phone ? <a href={telHref(phone)} className="font-semibold text-forest-800 underline underline-offset-2">Call {formatUsPhone(phone)}</a> : "Get in touch"}.
              </p>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
