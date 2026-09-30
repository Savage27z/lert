import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { ProductGrid } from "@/components/store/ProductCard";
import { CatalogUnavailable, EmptyState } from "@/components/store/States";
import { getCategories, listProducts, PER_PAGE, type ListingQuery } from "@/lib/storefront/queries";
import { listingHref } from "@/lib/storefront/search-params";
import type { ProductListing, SortValue } from "@/lib/storefront/types";
import { FilterForm } from "./FilterForm";
import { MobileFilters } from "./MobileFilters";
import { SortSelect } from "./SortSelect";

export async function ShopListing({ query, basePath, title, kicker, intro, fixedCategory }: {
  query: ListingQuery & { sort: SortValue };
  basePath: string;
  title: string;
  kicker?: string;
  intro?: string;
  fixedCategory?: string;
}) {
  const effective = { ...query, category: fixedCategory ?? query.category };
  let listing: ProductListing;
  let categories;
  try {
    [listing, categories] = await Promise.all([
      listProducts({ ...effective, sort: query.q && query.sort === "featured" ? "relevance" : query.sort }),
      getCategories(),
    ]);
  } catch {
    return <CatalogUnavailable />;
  }

  const page = query.page ?? 1;
  const pages = Math.max(1, Math.ceil(listing.total / PER_PAGE));
  const activeFilters = (query.brands?.length ?? 0) + (query.inStock ? 1 : 0) + (query.onSale ? 1 : 0) + (!fixedCategory && query.category ? 1 : 0);
  const categoryHref = (slug: string | undefined) =>
    slug ? listingHref(`/categories/${slug}`, { ...query, page: 1, brands: [] }, { category: undefined })
         : listingHref("/shop", { ...query, category: undefined, page: 1, brands: [] });

  const sortHidden: [string, string][] = [];
  if (query.q) sortHidden.push(["q", query.q]);
  if (!fixedCategory && query.category) sortHidden.push(["category", query.category]);
  if (query.inStock) sortHidden.push(["stock", "1"]);
  if (query.onSale) sortHidden.push(["sale", "1"]);
  for (const b of query.brands ?? []) sortHidden.push(["brand", b]);

  const filterProps = {
    action: basePath,
    q: query.q,
    sort: query.sort,
    category: effective.category,
    showCategoryField: !fixedCategory,
    categories: categories.map((c) => ({ ...c, href: categoryHref(c.slug) })),
    allHref: categoryHref(undefined),
    brands: listing.facets.brands,
    selectedBrands: query.brands ?? [],
    inStock: !!query.inStock,
    onSale: !!query.onSale,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-6">
        {kicker && <p className="kicker">{kicker}</p>}
        <h1 className="mt-1.5 font-display text-3xl text-forest-900 sm:text-4xl">
          {query.q ? <>Results for “{query.q}”</> : title}
        </h1>
        {intro && !query.q && <p className="mt-2 max-w-2xl text-ink-700">{intro}</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <FilterForm {...filterProps} autoSubmit idPrefix="desk" />
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 pb-4">
            <p className="text-sm text-ink-500" aria-live="polite">
              <span className="font-semibold text-ink-900 tabular">{listing.total}</span> {listing.total === 1 ? "product" : "products"}
            </p>
            <div className="flex items-center gap-2">
              <MobileFilters activeCount={activeFilters}>
                <FilterForm {...filterProps} idPrefix="mob" />
              </MobileFilters>
              <SortSelect action={basePath} hidden={sortHidden} value={query.sort} />
            </div>
          </div>

          {listing.items.length === 0 ? (
            <EmptyState
              title="No products found"
              body={query.q ? `We couldn't find anything matching “${query.q}”. Try a shorter word or a different spelling.` : "Nothing matches these filters right now."}
              action={<Link href="/shop" className="btn btn-primary">See all products</Link>}
            />
          ) : (
            <ProductGrid products={listing.items} priorityCount={4} />
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
              {page > 1 ? (
                <Link href={listingHref(basePath, query, { page: String(page - 1) })} className="btn btn-outline h-11 px-3" rel="prev"><ChevronLeftIcon size={18} /> Previous</Link>
              ) : null}
              <span className="px-3 text-sm text-ink-500 tabular">Page {page} of {pages}</span>
              {page < pages ? (
                <Link href={listingHref(basePath, query, { page: String(page + 1) })} className="btn btn-outline h-11 px-3" rel="next">Next <ChevronRightIcon size={18} /></Link>
              ) : null}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
