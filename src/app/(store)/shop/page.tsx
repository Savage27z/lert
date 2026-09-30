import type { Metadata } from "next";
import { ShopListing } from "@/components/store/shop/ShopListing";
import { parseListingParams, type RawSearchParams } from "@/lib/storefront/search-params";

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const q = parseListingParams(await searchParams);
  return {
    title: q.q ? `Search: ${q.q}` : "Shop all products",
    alternates: { canonical: "/shop" },
    // Search/filter permutations are useful to shoppers, not to search engines.
    robots: q.q || q.brands?.length || q.inStock || q.onSale || (q.page ?? 1) > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const query = parseListingParams(await searchParams);
  return <ShopListing query={query} basePath="/shop" title="Shop all products" kicker="The whole store" />;
}
