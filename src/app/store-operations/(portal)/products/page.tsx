import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ops/PageHeader";
import { ProductsTable } from "@/components/ops/ProductsTable";
import { requireStaff } from "@/lib/ops/auth";
import { opsPath } from "@/lib/ops/paths";
import { can } from "@/lib/ops/permissions";
import { listOpsProducts, listTaxonomy, OPS_PAGE_SIZE, type ProductFilters } from "@/lib/ops/queries";

export const metadata: Metadata = { title: "Products" };

type SP = Record<string, string | undefined>;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const staff = await requireStaff("catalog.read");
  const sp = await searchParams;
  const filters: ProductFilters = {
    q: sp.q?.slice(0, 80) || undefined,
    category: sp.category || undefined,
    status: (["active", "draft", "archived", "all"] as const).find((s) => s === sp.status),
    visibility: (["published", "hidden"] as const).find((s) => s === sp.visibility),
    review: sp.review === "1",
    page: Number(sp.page) || 1,
  };
  const [{ products, total, page }, { categories }] = await Promise.all([listOpsProducts(filters), listTaxonomy()]);
  const pages = Math.max(1, Math.ceil(total / OPS_PAGE_SIZE));
  const qs = (over: SP) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][]);
    return `${opsPath("/products")}?${p}`;
  };

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}. Click a price or stock level to change it — changes go live on the website immediately.`}
        actions={can(staff, "catalog.write") && <Link href={opsPath("/products/new")} className="o-btn o-btn-primary">Add product</Link>}
      />

      <form method="get" className="mb-3 flex flex-wrap items-end gap-2" role="search">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="q" className="sr-only">Search products</label>
          <input id="q" name="q" defaultValue={filters.q} placeholder="Search name, POS name, SKU, brand or category" className="o-input" />
        </div>
        <select name="category" defaultValue={filters.category ?? ""} aria-label="Category" className="o-input w-auto">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="visibility" defaultValue={filters.visibility ?? ""} aria-label="Visibility" className="o-input w-auto">
          <option value="">Any visibility</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
        </select>
        <select name="status" defaultValue={filters.status ?? ""} aria-label="Status" className="o-input w-auto">
          <option value="">Active &amp; drafts</option>
          <option value="active">Active</option>
          <option value="draft">Drafts</option>
          <option value="archived">Archived</option>
          <option value="all">Everything</option>
        </select>
        <label className="flex h-9 items-center gap-2 rounded border border-cream-300 bg-white px-3 text-[13px]">
          <input type="checkbox" name="review" value="1" defaultChecked={filters.review} className="accent-[var(--color-forest-700)]" /> Needs review
        </label>
        <button type="submit" className="o-btn o-btn-secondary">Apply</button>
        {(filters.q || filters.category || filters.status || filters.visibility || filters.review) && (
          <Link href={opsPath("/products")} className="o-btn text-ink-500 hover:underline">Clear</Link>
        )}
      </form>

      <ProductsTable
        products={products}
        perms={{ catalog: can(staff, "catalog.write"), pricing: can(staff, "pricing.write"), inventory: can(staff, "inventory.write") }}
      />

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-3 flex items-center justify-end gap-2 text-[13px]">
          {page > 1 && <Link href={qs({ page: String(page - 1) })} className="o-btn o-btn-secondary">Previous</Link>}
          <span className="text-ink-500 tabular">Page {page} of {pages}</span>
          {page < pages && <Link href={qs({ page: String(page + 1) })} className="o-btn o-btn-secondary">Next</Link>}
        </nav>
      )}
    </>
  );
}
