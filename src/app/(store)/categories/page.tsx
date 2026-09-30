import type { Metadata } from "next";
import Link from "next/link";
import { AisleNav } from "@/components/store/home/AisleNav";
import { CatalogUnavailable, EmptyState } from "@/components/store/States";
import { getCategories } from "@/lib/storefront/queries";

export const metadata: Metadata = { title: "Categories", alternates: { canonical: "/categories" } };

export default async function CategoriesPage() {
  const categories = await getCategories().catch(() => null);
  if (!categories) return <CatalogUnavailable />;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
      <p className="kicker">Every aisle</p>
      <h1 className="mt-1.5 font-display text-3xl text-forest-900 sm:text-4xl">Shop by category</h1>
      <div className="mt-8">
        {categories.length ? <AisleNav categories={categories} /> : (
          <EmptyState title="No categories yet" action={<Link href="/shop" className="btn btn-primary">Browse all products</Link>} />
        )}
      </div>
    </div>
  );
}
