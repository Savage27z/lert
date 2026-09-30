import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopListing } from "@/components/store/shop/ShopListing";
import { getCategories } from "@/lib/storefront/queries";
import { parseListingParams, type RawSearchParams } from "@/lib/storefront/search-params";

async function findCategory(slug: string) {
  const categories = await getCategories().catch(() => []);
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: category.description ?? `Shop ${category.name.toLowerCase()} at ADISAH African Store.`,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();
  const query = parseListingParams(await searchParams);
  return (
    <ShopListing
      query={query}
      basePath={`/categories/${slug}`}
      fixedCategory={slug}
      title={category.name}
      kicker="Aisle"
      intro={category.description ?? undefined}
    />
  );
}
