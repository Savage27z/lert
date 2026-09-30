// Shapes returned by the public storefront_* database functions.

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface ImageRef {
  path: string;
  alt: string;
}

export interface CategoryRef {
  slug: string;
  name: string;
}

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: CategoryRef | null;
  image: ImageRef | null;
  pricing_type: "fixed" | "variable";
  variable_price_note: string | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  regular_price_cents: number | null;
  on_sale: boolean;
  variant_count: number;
  purchasable: boolean;
  stock_status: StockStatus;
  quick_add_variant_id: string | null;
  quick_add_variant_name: string | null;
}

export interface ProductVariant {
  id: string;
  name: string;
  price_cents: number | null;
  regular_price_cents: number | null;
  on_sale: boolean;
  sale_ends_at: string | null;
  stock_status: StockStatus;
  purchasable: boolean;
  fulfillment: { pickup: boolean; local_delivery: boolean; shipping: boolean };
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  usage_notes: string | null;
  storage_notes: string | null;
  brand: string | null;
  brand_slug: string | null;
  category: CategoryRef | null;
  pricing_type: "fixed" | "variable";
  variable_price_note: string | null;
  updated_at: string;
  images: ImageRef[];
  variants: ProductVariant[];
  related: ProductCard[];
}

export interface CategorySummary {
  slug: string;
  name: string;
  description: string | null;
  image_path: string | null;
  product_count: number;
}

export interface ProductListing {
  total: number;
  limit: number;
  offset: number;
  items: ProductCard[];
  facets: { brands: { slug: string; name: string; count: number }[] };
}

export interface HomeData {
  popular_source: "sales" | "featured";
  popular: ProductCard[];
  featured: ProductCard[];
  specials: ProductCard[];
  specials_ends_at: string | null;
  categories: CategorySummary[];
}

export interface StoreSettings {
  business_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  store_address: { line1: string; line2?: string; city: string; state: string; postal_code: string } | null;
  store_hours: { days: string; opens: string; closes: string }[] | null;
  announcement: { text: string; href?: string } | null;
  social_links: Record<string, string> | null;
  fulfillment: { pickup: boolean; local_delivery: boolean; shipping: boolean } | null;
}

export type CartLineStatus = "ok" | "unavailable" | "quantity_adjusted" | "removed";

export interface PricedCartLine {
  variant_id: string;
  status: CartLineStatus;
  product_slug: string;
  product_name: string;
  variant_name: string | null;
  image: ImageRef | null;
  unit_price_cents: number | null;
  regular_unit_price_cents: number | null;
  requested_quantity: number;
  quantity: number;
  line_total_cents: number;
}

export interface PricedCart {
  lines: PricedCartLine[];
  subtotal_cents: number;
  item_count: number;
  has_issues: boolean;
}

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "popular", label: "Popular" },
  { value: "name", label: "Name A–Z" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
