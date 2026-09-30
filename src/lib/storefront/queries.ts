import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import type {
  CategorySummary, HomeData, ProductCard, ProductDetail, ProductListing, SortValue, StoreSettings,
} from "./types";

// All public catalog reads go through storefront_* database functions, which
// only ever return published products and customer-safe fields.

class CatalogUnavailableError extends Error {}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await createPublicClient().rpc(fn, args);
  if (error) {
    console.error(`[storefront] ${fn} failed`, error.message);
    throw new CatalogUnavailableError("The catalog is temporarily unavailable.");
  }
  return data as T;
}

const DEFAULT_SETTINGS: StoreSettings = {
  business_name: "ADISAH African Store",
  contact_phone: null,
  contact_email: null,
  store_address: null,
  store_hours: null,
  announcement: null,
  social_links: null,
  fulfillment: null,
};

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  try {
    return { ...DEFAULT_SETTINGS, ...(await rpc<Partial<StoreSettings>>("storefront_settings")) };
  } catch {
    return DEFAULT_SETTINGS; // the shell must still render if settings fail
  }
});

export const getCategories = cache(() => rpc<CategorySummary[]>("storefront_categories"));

export const getHome = cache(() => rpc<HomeData>("storefront_home"));

export const getProduct = cache((slug: string) =>
  rpc<ProductDetail | null>("storefront_product", { p_slug: slug }),
);

export interface ListingQuery {
  q?: string;
  category?: string;
  brands?: string[];
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  sort?: SortValue | "relevance";
  page?: number;
  perPage?: number;
}

export const PER_PAGE = 24;

export function listProducts(query: ListingQuery): Promise<ProductListing> {
  const perPage = query.perPage ?? PER_PAGE;
  const page = Math.max(1, query.page ?? 1);
  return rpc<ProductListing>("storefront_products", {
    p_query: query.q || null,
    p_category: query.category || null,
    p_brands: query.brands?.length ? query.brands : null,
    p_in_stock: query.inStock ?? false,
    p_on_sale: query.onSale ?? false,
    p_featured: query.featured ?? false,
    p_sort: query.sort ?? "featured",
    p_limit: perPage,
    p_offset: (page - 1) * perPage,
  });
}

export const getSitemapData = () =>
  rpc<{ products: { slug: string; updated_at: string }[]; categories: string[] }>("storefront_sitemap");

export const getCards = (ids: string[]) => rpc<ProductCard[]>("storefront_cards", { p_ids: ids });

export { CatalogUnavailableError };
