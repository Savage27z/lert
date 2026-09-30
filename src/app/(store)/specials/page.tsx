import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/store/ProductCard";
import { CatalogUnavailable, EmptyState } from "@/components/store/States";
import { listProducts } from "@/lib/storefront/queries";

export const metadata: Metadata = { title: "Specials", alternates: { canonical: "/specials" } };
export const dynamic = "force-dynamic";

export default async function SpecialsPage() {
  const listing = await listProducts({ onSale: true, perPage: 60, sort: "featured" }).catch(() => null);
  if (!listing) return <CatalogUnavailable />;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
      <p className="kicker">Savings</p>
      <h1 className="mt-1.5 font-display text-3xl text-forest-900 sm:text-4xl">Specials</h1>
      <div className="mt-8">
        {listing.items.length ? <ProductGrid products={listing.items} /> : (
          <EmptyState
            title="No specials running right now"
            body="New specials are added regularly. Join our email list at the bottom of the page to hear about them first."
            action={<Link href="/shop" className="btn btn-primary">Shop all products</Link>}
          />
        )}
      </div>
    </div>
  );
}
