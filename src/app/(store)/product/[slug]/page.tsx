import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon } from "@/components/icons";
import { ProductGrid } from "@/components/store/ProductCard";
import { BuyBox } from "@/components/store/product/BuyBox";
import { Gallery } from "@/components/store/product/Gallery";
import { CatalogUnavailable } from "@/components/store/States";
import { env } from "@/lib/env";
import { formatUsPhone, telHref } from "@/lib/phone";
import { productImageUrl } from "@/lib/storefront/images";
import { getProduct, getStoreSettings } from "@/lib/storefront/queries";
import type { ProductDetail } from "@/lib/storefront/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return { title: "Product not found" };
  const description = product.description?.slice(0, 160)
    ?? `Buy ${product.name}${product.brand ? ` by ${product.brand}` : ""} online at ADISAH African Store.`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      images: product.images[0] ? [{ url: productImageUrl(product.images[0].path), alt: product.images[0].alt }] : undefined,
    },
  };
}

function jsonLd(product: ProductDetail) {
  const priced = product.variants.filter((v) => v.price_cents != null);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: product.images.map((i) => productImageUrl(i.path)),
    url: `${env.siteUrl}/product/${product.slug}`,
    offers: priced.map((v) => ({
      "@type": "Offer",
      name: v.name,
      priceCurrency: "USD",
      price: (v.price_cents! / 100).toFixed(2),
      availability: v.stock_status === "out_of_stock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    })),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product: ProductDetail | null;
  try {
    product = await getProduct(slug);
  } catch {
    return <CatalogUnavailable />;
  }
  if (!product) notFound();

  const settings = await getStoreSettings();
  const phone = settings.contact_phone ? formatUsPhone(settings.contact_phone) : null;
  const phoneHref = settings.contact_phone ? telHref(settings.contact_phone) : null;

  const details = [
    { title: "Description", body: product.description },
    { title: "Ingredients", body: product.ingredients },
    { title: "How to use", body: product.usage_notes },
    { title: "Storage", body: product.storage_notes },
  ].filter((d): d is { title: string; body: string } => !!d.body);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-5 sm:px-6 sm:pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(product)).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/shop" className="hover:text-forest-800">Shop</Link></li>
          {product.category && (
            <>
              <li aria-hidden="true"><ChevronRightIcon size={14} /></li>
              <li><Link href={`/categories/${product.category.slug}`} className="hover:text-forest-800">{product.category.name}</Link></li>
            </>
          )}
          <li aria-hidden="true"><ChevronRightIcon size={14} /></li>
          <li aria-current="page" className="truncate text-ink-700">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <Gallery images={product.images} name={product.name} brand={product.brand} categorySlug={product.category?.slug} />

        <div>
          {product.brand && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">{product.brand}</p>}
          <h1 className="mt-1 font-display text-3xl leading-tight text-forest-900 sm:text-[2.5rem]">{product.name}</h1>
          <div className="mt-5">
            <BuyBox product={product} phone={phone} phoneHref={phoneHref} />
          </div>

          <div className="mt-8 divide-y divide-cream-200 border-y border-cream-200">
            {details.map((d, i) => (
              <details key={d.title} open={i === 0} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink-900">
                  {d.title}<span className="text-xl text-ink-400 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-ink-700">{d.body}</p>
              </details>
            ))}
            <details open={details.length === 0} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink-900">
                Pickup &amp; delivery<span className="text-xl text-ink-400 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-700">
                Pickup and delivery options are shown at checkout, once online ordering opens.
                {phone && phoneHref && <> Questions? Call <a href={phoneHref} className="font-semibold text-forest-800 underline underline-offset-2">{phone}</a>.</>}
              </p>
            </details>
          </div>
        </div>
      </div>

      {product.related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-16">
          <h2 id="related-title" className="mb-5 font-display text-2xl text-forest-900">More from {product.category?.name ?? "the store"}</h2>
          <ProductGrid products={product.related.slice(0, 5)} />
        </section>
      )}
    </div>
  );
}
