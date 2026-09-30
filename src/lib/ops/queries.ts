import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface OpsVariant {
  id: string;
  product_id: string;
  name: string;
  source_name: string | null;
  sku: string | null;
  regular_price_cents: number | null;
  track_inventory: boolean;
  stock_quantity: number | null;
  low_stock_threshold: number;
  manual_stock_status: "in_stock" | "low_stock" | "out_of_stock";
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  online_enabled: boolean;
  shipping_enabled: boolean;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  sort_order: number;
  needs_review: boolean;
  review_notes: string | null;
  archived_at: string | null;
  updated_at: string;
}

export interface OpsProduct {
  id: string;
  slug: string;
  name: string;
  source_name: string | null;
  description: string | null;
  ingredients: string | null;
  usage_notes: string | null;
  storage_notes: string | null;
  status: "draft" | "active" | "archived";
  visibility: "published" | "hidden";
  pricing_type: "fixed" | "variable";
  is_featured: boolean;
  needs_review: boolean;
  review_notes: string | null;
  search_keywords: string[];
  brand_id: string | null;
  category_id: string | null;
  updated_at: string;
  created_at: string;
  brand: { name: string } | null;
  category: { name: string; slug: string } | null;
  variants: OpsVariant[];
}

const PRODUCT_SELECT = `
  id, slug, name, source_name, description, ingredients, usage_notes, storage_notes, status, visibility,
  pricing_type, is_featured, needs_review, review_notes, search_keywords, brand_id, category_id, updated_at, created_at,
  brand:brands(name), category:categories(name, slug),
  variants:product_variants(id, product_id, name, source_name, sku, regular_price_cents, track_inventory, stock_quantity,
    low_stock_threshold, manual_stock_status, stock_status, online_enabled, shipping_enabled, delivery_enabled,
    pickup_enabled, sort_order, needs_review, review_notes, archived_at, updated_at)
`;

export function normalizeSearch(q: string) {
  return q.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export interface ProductFilters {
  q?: string;
  category?: string;
  status?: "active" | "draft" | "archived" | "all";
  visibility?: "published" | "hidden";
  review?: boolean;
  page?: number;
}

export const OPS_PAGE_SIZE = 50;

export async function listOpsProducts(f: ProductFilters) {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  let query = supabase.from("products").select(PRODUCT_SELECT, { count: "exact" });

  if (f.q) {
    // search_text contains name, POS name, brand, category, keywords, variant names and SKUs
    const term = normalizeSearch(f.q).replace(/[%_,()]/g, " ").slice(0, 80);
    query = query.ilike("search_text", `%${term}%`);
  }
  if (f.category) query = query.eq("category_id", f.category);
  if (!f.status) query = query.neq("status", "archived");
  else if (f.status !== "all") query = query.eq("status", f.status);
  if (f.visibility) query = query.eq("visibility", f.visibility);
  if (f.review) query = query.eq("needs_review", true);

  const { data, count, error } = await query
    .order("name")
    .order("sort_order", { referencedTable: "variants" })
    .range((page - 1) * OPS_PAGE_SIZE, page * OPS_PAGE_SIZE - 1);
  if (error) throw new Error(`listOpsProducts: ${error.message}`);
  return { products: (data ?? []) as unknown as OpsProduct[], total: count ?? 0, page };
}

export async function getOpsProduct(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products").select(PRODUCT_SELECT).eq("id", id)
    .order("sort_order", { referencedTable: "variants" }).maybeSingle();
  if (error) throw new Error(`getOpsProduct: ${error.message}`);
  return data as unknown as OpsProduct | null;
}

export async function listTaxonomy() {
  const supabase = await createClient();
  const [cats, brands] = await Promise.all([
    supabase.from("categories").select("id, name, slug, is_active").order("sort_order"),
    supabase.from("brands").select("id, name, slug").order("name"),
  ]);
  return { categories: cats.data ?? [], brands: brands.data ?? [] };
}

export async function getPriceHistory(variantIds: string[]) {
  if (variantIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("price_history")
    .select("id, variant_id, previous_price_cents, new_price_cents, changed_by_email, changed_at")
    .in("variant_id", variantIds)
    .order("changed_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export interface InventoryRow extends OpsVariant {
  product: { id: string; name: string; status: string; visibility: string; pricing_type: string };
}

export async function listInventory(f: { q?: string; stock?: string; page?: number }) {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  let query = supabase
    .from("product_variants")
    .select(`*, product:products!inner(id, name, status, visibility, pricing_type, search_text)`, { count: "exact" })
    .is("archived_at", null)
    .neq("product.status", "archived");
  if (f.stock === "out_of_stock" || f.stock === "low_stock" || f.stock === "in_stock") query = query.eq("stock_status", f.stock);
  if (f.stock === "untracked") query = query.eq("track_inventory", false);
  if (f.q) query = query.ilike("product.search_text", `%${normalizeSearch(f.q).replace(/[%_,()]/g, " ").slice(0, 80)}%`);
  const { data, count, error } = await query
    .order("stock_status", { ascending: false })
    .order("product(name)")
    .range((page - 1) * OPS_PAGE_SIZE, page * OPS_PAGE_SIZE - 1);
  if (error) throw new Error(`listInventory: ${error.message}`);
  return { rows: (data ?? []) as unknown as InventoryRow[], total: count ?? 0, page };
}

export async function getDashboard(canOrders: boolean, canAudit: boolean) {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const head = { count: "exact" as const, head: true };
  const [total, online, out, low, review, recent] = await Promise.all([
    supabase.from("products").select("id", head).neq("status", "archived"),
    supabase.from("products").select("id", head).eq("status", "active").eq("visibility", "published"),
    supabase.from("product_variants").select("id", head).is("archived_at", null).eq("stock_status", "out_of_stock"),
    supabase.from("product_variants").select("id", head).is("archived_at", null).eq("stock_status", "low_stock"),
    supabase.from("products").select("id", head).neq("status", "archived").eq("needs_review", true),
    supabase.from("products").select("id, name, updated_at, needs_review, visibility, status")
      .neq("status", "archived").order("updated_at", { ascending: false }).limit(6),
  ]);

  const needsReview = await supabase.from("products").select("id, name, review_notes")
    .neq("status", "archived").eq("needs_review", true).order("name").limit(8);

  let orders = null;
  if (canOrders) {
    const [all, pending, completed, paidThisMonth, latest] = await Promise.all([
      supabase.from("orders").select("id", head),
      supabase.from("orders").select("id", head).eq("payment_status", "paid").in("fulfillment_status", ["unfulfilled", "processing"]),
      supabase.from("orders").select("id", head).eq("fulfillment_status", "delivered"),
      supabase.from("orders").select("total_cents").eq("payment_status", "paid").gte("placed_at", monthStart.toISOString()),
      supabase.from("orders").select("id, order_number, customer_name, total_cents, payment_status, fulfillment_status, placed_at")
        .order("placed_at", { ascending: false }).limit(6),
    ]);
    orders = {
      total: all.count ?? 0,
      pending: pending.count ?? 0,
      completed: completed.count ?? 0,
      revenueThisMonthCents: (paidThisMonth.data ?? []).reduce((s, o) => s + o.total_cents, 0),
      latest: latest.data ?? [],
    };
  }

  const activity = canAudit
    ? (await supabase.from("audit_log").select("id, occurred_at, actor_email, summary").order("occurred_at", { ascending: false }).limit(8)).data ?? []
    : [];

  return {
    catalog: {
      total: total.count ?? 0,
      online: online.count ?? 0,
      outOfStockVariants: out.count ?? 0,
      lowStockVariants: low.count ?? 0,
      needsReview: review.count ?? 0,
    },
    recent: recent.data ?? [],
    needsReview: needsReview.data ?? [],
    orders,
    activity,
  };
}

export async function listOrders(f: { q?: string; status?: string; page?: number }) {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  let query = supabase
    .from("orders")
    .select("id, order_number, customer_name, email, total_cents, payment_status, fulfillment_status, fulfillment_method, placed_at", { count: "exact" });
  if (f.q) {
    const t = f.q.replace(/[%_,()]/g, " ").trim().slice(0, 80);
    query = query.or(`order_number.ilike.%${t}%,customer_name.ilike.%${t}%,email.ilike.%${t}%`);
  }
  if (f.status) query = query.eq("fulfillment_status", f.status);
  const { data, count, error } = await query.order("placed_at", { ascending: false })
    .range((page - 1) * OPS_PAGE_SIZE, page * OPS_PAGE_SIZE - 1);
  if (error) throw new Error(`listOrders: ${error.message}`);
  return { orders: data ?? [], total: count ?? 0, page };
}

export async function listActivity(f: { entity?: string; page?: number }) {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  let query = supabase.from("audit_log")
    .select("id, occurred_at, actor_email, actor_role, action, entity_type, entity_id, summary, changes", { count: "exact" });
  if (f.entity) query = query.eq("entity_type", f.entity);
  const { data, count, error } = await query.order("occurred_at", { ascending: false })
    .range((page - 1) * OPS_PAGE_SIZE, page * OPS_PAGE_SIZE - 1);
  if (error) throw new Error(`listActivity: ${error.message}`);
  return { entries: data ?? [], total: count ?? 0, page };
}
