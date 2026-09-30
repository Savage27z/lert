"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseDollarsToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { staffForAction } from "./auth";
import { dbError, NOT_ALLOWED, type ActionResult } from "./errors";
import { opsPath } from "./paths";

// Every action checks the permission up front for a clear error message, but
// the real enforcement is in the database (RLS + guard triggers): these
// updates run with the staff member's own session, never a service key.

const uuid = z.uuid();
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function refreshOps() {
  revalidatePath(opsPath(), "layout");
}

// ---------------------------------------------------------------------------
// Variant: price / stock / online
// ---------------------------------------------------------------------------

export async function updateVariantPrice(variantId: string, priceText: string): Promise<ActionResult<{ cents: number }>> {
  if (!(await staffForAction("pricing.write"))) return NOT_ALLOWED;
  if (!uuid.safeParse(variantId).success) return { ok: false, error: "Unknown variant." };
  const cents = parseDollarsToCents(priceText);
  if (cents == null || cents <= 0) return { ok: false, error: "Enter a price like 14.75." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants").update({ regular_price_cents: cents }).eq("id", variantId).select("id");
  if (error) return dbError("update price", error);
  if (!data?.length) return NOT_ALLOWED;
  refreshOps();
  return { ok: true, data: { cents } };
}

const stockSchema = z.object({
  trackInventory: z.boolean(),
  quantity: z.number().int().min(0).max(100000).nullable(),
  manualStatus: z.enum(["in_stock", "low_stock", "out_of_stock"]),
  lowStockThreshold: z.number().int().min(0).max(10000).optional(),
});

export async function updateVariantStock(variantId: string, input: z.input<typeof stockSchema>): Promise<ActionResult> {
  if (!(await staffForAction("inventory.write"))) return NOT_ALLOWED;
  const parsed = stockSchema.safeParse(input);
  if (!uuid.safeParse(variantId).success || !parsed.success) return { ok: false, error: "Check the stock values." };
  const s = parsed.data;
  if (s.trackInventory && s.quantity == null) return { ok: false, error: "Enter a quantity to track stock." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .update({
      track_inventory: s.trackInventory,
      stock_quantity: s.quantity,
      manual_stock_status: s.manualStatus,
      ...(s.lowStockThreshold != null ? { low_stock_threshold: s.lowStockThreshold } : {}),
    })
    .eq("id", variantId)
    .select("id");
  if (error) return dbError("update stock", error);
  if (!data?.length) return NOT_ALLOWED;
  refreshOps();
  return { ok: true };
}

export async function setVariantOnline(variantId: string, enabled: boolean): Promise<ActionResult> {
  if (!(await staffForAction("catalog.write"))) return NOT_ALLOWED;
  if (!uuid.safeParse(variantId).success) return { ok: false, error: "Unknown variant." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants").update({ online_enabled: enabled }).eq("id", variantId).select("id");
  if (error) return dbError("toggle online", error);
  if (!data?.length) return NOT_ALLOWED;
  refreshOps();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable().optional();

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(160),
  slug: z.string().trim().toLowerCase().regex(SLUG, "URL name may use lowercase letters, numbers and dashes.").max(120),
  brand_id: z.union([uuid, z.literal("")]).transform((v) => v || null),
  category_id: z.union([uuid, z.literal("")]).transform((v) => v || null),
  description: optionalText(5000),
  ingredients: optionalText(3000),
  usage_notes: optionalText(3000),
  storage_notes: optionalText(1000),
  status: z.enum(["draft", "active", "archived"]),
  visibility: z.enum(["published", "hidden"]),
  pricing_type: z.enum(["fixed", "variable"]),
  is_featured: z.boolean(),
  needs_review: z.boolean(),
  review_notes: optionalText(2000),
  search_keywords: z.array(z.string().trim().min(1).max(40)).max(20),
});

function productFromForm(fd: FormData) {
  return productSchema.safeParse({
    name: fd.get("name") ?? "",
    slug: fd.get("slug") ?? "",
    brand_id: fd.get("brand_id") ?? "",
    category_id: fd.get("category_id") ?? "",
    description: fd.get("description") ?? "",
    ingredients: fd.get("ingredients") ?? "",
    usage_notes: fd.get("usage_notes") ?? "",
    storage_notes: fd.get("storage_notes") ?? "",
    status: fd.get("status") ?? "draft",
    visibility: fd.get("visibility") ?? "hidden",
    pricing_type: fd.get("pricing_type") ?? "fixed",
    is_featured: fd.get("is_featured") === "on",
    needs_review: fd.get("needs_review") === "on",
    review_notes: fd.get("review_notes") ?? "",
    search_keywords: String(fd.get("search_keywords") ?? "").split(",").map((k) => k.trim()).filter(Boolean),
  });
}

export async function saveProduct(productId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await staffForAction("catalog.write"))) return NOT_ALLOWED;
  if (!uuid.safeParse(productId).success) return { ok: false, error: "Unknown product." };
  const parsed = productFromForm(fd);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").update(parsed.data).eq("id", productId).select("id");
  if (error) return dbError("save product", error);
  if (!data?.length) return NOT_ALLOWED;
  refreshOps();
  return { ok: true, message: "Product saved." };
}

const newProductSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(160),
  category_id: z.union([uuid, z.literal("")]).transform((v) => v || null),
  brand_id: z.union([uuid, z.literal("")]).transform((v) => v || null),
  pricing_type: z.enum(["fixed", "variable"]),
  variant_name: z.string().trim().min(1).max(80),
  price: z.string().trim(),
  sku: z.string().trim().max(64).transform((v) => v || null),
});

function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "product";
}

export async function createProduct(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const staff = await staffForAction("catalog.write");
  if (!staff) return NOT_ALLOWED;
  const parsed = newProductSchema.safeParse({
    name: fd.get("name") ?? "",
    category_id: fd.get("category_id") ?? "",
    brand_id: fd.get("brand_id") ?? "",
    pricing_type: fd.get("pricing_type") ?? "fixed",
    variant_name: fd.get("variant_name") || "Standard",
    price: fd.get("price") ?? "",
    sku: fd.get("sku") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const p = parsed.data;

  let cents: number | null = null;
  if (p.pricing_type === "fixed" && p.price) {
    cents = parseDollarsToCents(p.price);
    if (cents == null || cents <= 0) return { ok: false, error: "Enter a price like 14.75, or leave it blank for now." };
    if (!staff.permissions.includes("pricing.write")) return { ok: false, error: "You can't set prices. Leave the price blank." };
  }

  const supabase = await createClient();
  let slug = slugify(p.name);
  const { data: clash } = await supabase.from("products").select("slug").like("slug", `${slug}%`);
  if (clash?.some((c) => c.slug === slug)) slug = `${slug}-${(clash?.length ?? 0) + 1}`;

  // New products start as hidden drafts so nothing goes live by accident.
  const { data: product, error } = await supabase
    .from("products")
    .insert({ name: p.name, slug, category_id: p.category_id, brand_id: p.brand_id, pricing_type: p.pricing_type })
    .select("id")
    .single();
  if (error) return dbError("create product", error);

  const { error: vErr } = await supabase.from("product_variants").insert({
    product_id: product.id,
    name: p.variant_name,
    sku: p.sku,
    regular_price_cents: cents,
  });
  if (vErr) return dbError("create first variant", vErr);

  refreshOps();
  redirect(opsPath(`/products/${product.id}?created=1`));
}

export async function setProductStatus(productId: string, status: "active" | "draft" | "archived"): Promise<ActionResult> {
  if (!(await staffForAction("catalog.write"))) return NOT_ALLOWED;
  if (!uuid.safeParse(productId).success) return { ok: false, error: "Unknown product." };
  const supabase = await createClient();
  const patch = status === "archived" ? { status, visibility: "hidden" as const } : { status };
  const { data, error } = await supabase.from("products").update(patch).eq("id", productId).select("id");
  if (error) return dbError("set status", error);
  if (!data?.length) return NOT_ALLOWED;
  refreshOps();
  return { ok: true };
}

const bulkSchema = z.object({
  ids: z.array(uuid).min(1).max(200),
  visibility: z.enum(["published", "hidden"]),
});

export async function bulkSetVisibility(ids: string[], visibility: "published" | "hidden"): Promise<ActionResult<{ count: number }>> {
  if (!(await staffForAction("catalog.write"))) return NOT_ALLOWED;
  const parsed = bulkSchema.safeParse({ ids, visibility });
  if (!parsed.success) return { ok: false, error: "Select between 1 and 200 products." };
  const supabase = await createClient();
  // Archived products can't be published in bulk; restore them individually.
  const { data, error } = await supabase
    .from("products").update({ visibility }).in("id", parsed.data.ids).neq("status", "archived").select("id");
  if (error) return dbError("bulk visibility", error);
  refreshOps();
  return { ok: true, data: { count: data?.length ?? 0 } };
}

// ---------------------------------------------------------------------------
// Variant details
// ---------------------------------------------------------------------------

const variantSchema = z.object({
  name: z.string().trim().min(1, "Variant name is required.").max(80),
  sku: z.string().trim().max(64).transform((v) => v || null),
  shipping_enabled: z.boolean(),
  delivery_enabled: z.boolean(),
  pickup_enabled: z.boolean(),
  needs_review: z.boolean(),
});

function variantFromForm(fd: FormData) {
  return variantSchema.safeParse({
    name: fd.get("name") ?? "",
    sku: fd.get("sku") ?? "",
    shipping_enabled: fd.get("shipping_enabled") === "on",
    delivery_enabled: fd.get("delivery_enabled") === "on",
    pickup_enabled: fd.get("pickup_enabled") === "on",
    needs_review: fd.get("needs_review") === "on",
  });
}

export async function saveVariant(variantId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await staffForAction("catalog.write"))) return NOT_ALLOWED;
  if (!uuid.safeParse(variantId).success) return { ok: false, error: "Unknown variant." };
  const parsed = variantFromForm(fd);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the variant." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("product_variants").update(parsed.data).eq("id", variantId).select("id");
  if (error) return dbError("save variant", error);
  if (!data?.length) return NOT_ALLOWED;
  refreshOps();
  return { ok: true, message: "Variant saved." };
}

export async function addVariant(productId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const staff = await staffForAction("catalog.write");
  if (!staff) return NOT_ALLOWED;
  if (!uuid.safeParse(productId).success) return { ok: false, error: "Unknown product." };
  const name = String(fd.get("name") ?? "").trim();
  const sku = String(fd.get("sku") ?? "").trim() || null;
  const priceText = String(fd.get("price") ?? "").trim();
  if (!name || name.length > 80) return { ok: false, error: "Enter a variant name, e.g. 10 lbs." };
  let cents: number | null = null;
  if (priceText) {
    cents = parseDollarsToCents(priceText);
    if (cents == null || cents <= 0) return { ok: false, error: "Enter a price like 22.99." };
    if (!staff.permissions.includes("pricing.write")) return { ok: false, error: "You can't set prices. Leave the price blank." };
  }
  const supabase = await createClient();
  const { data: siblings } = await supabase.from("product_variants").select("sort_order").eq("product_id", productId);
  const sort = Math.max(0, ...(siblings ?? []).map((s) => s.sort_order)) + 10;
  const { error } = await supabase.from("product_variants").insert({
    product_id: productId, name, sku, regular_price_cents: cents, sort_order: sort,
  });
  if (error) return dbError("add variant", error);
  refreshOps();
  return { ok: true, message: `Added ${name}.` };
}

export async function setVariantArchived(variantId: string, archived: boolean): Promise<ActionResult> {
  if (!(await staffForAction("catalog.write"))) return NOT_ALLOWED;
  if (!uuid.safeParse(variantId).success) return { ok: false, error: "Unknown variant." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .update({ archived_at: archived ? new Date().toISOString() : null, ...(archived ? { online_enabled: false } : {}) })
    .eq("id", variantId)
    .select("id");
  if (error) return dbError("archive variant", error);
  if (!data?.length) return NOT_ALLOWED;
  refreshOps();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export async function signOutStaff() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(opsPath());
}
