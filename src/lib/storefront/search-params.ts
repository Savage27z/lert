import { SORT_OPTIONS, type SortValue } from "./types";
import type { ListingQuery } from "./queries";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseListingParams(sp: RawSearchParams): ListingQuery & { sort: SortValue } {
  const sortRaw = first(sp.sort);
  const sort = SORT_OPTIONS.some((o) => o.value === sortRaw) ? (sortRaw as SortValue) : "featured";
  const page = Number(first(sp.page));
  const category = first(sp.category);
  return {
    q: first(sp.q)?.trim().slice(0, 80) || undefined,
    category: category && SLUG.test(category) ? category : undefined,
    brands: all(sp.brand).filter((b) => SLUG.test(b)).slice(0, 20),
    inStock: first(sp.stock) === "1",
    onSale: first(sp.sale) === "1",
    sort,
    page: Number.isInteger(page) && page > 0 && page < 1000 ? page : 1,
  };
}

/** Builds a query string from the current listing state with overrides. */
export function listingHref(
  basePath: string,
  q: ListingQuery,
  overrides: Partial<Record<"q" | "category" | "sort" | "page" | "stock" | "sale", string | undefined>> & { brands?: string[] } = {},
) {
  const params = new URLSearchParams();
  const merged = {
    q: q.q,
    category: basePath === "/shop" ? q.category : undefined,
    sort: q.sort !== "featured" ? q.sort : undefined,
    stock: q.inStock ? "1" : undefined,
    sale: q.onSale ? "1" : undefined,
    page: q.page && q.page > 1 ? String(q.page) : undefined,
    ...overrides,
  };
  for (const [k, v] of Object.entries(merged)) {
    if (k !== "brands" && v) params.set(k, String(v));
  }
  for (const b of overrides.brands ?? q.brands ?? []) params.append("brand", b);
  const s = params.toString();
  return s ? `${basePath}?${s}` : basePath;
}
