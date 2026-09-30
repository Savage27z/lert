"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import {
  addVariant, createProduct, saveProduct, saveVariant, setProductStatus, setVariantArchived,
} from "@/lib/ops/actions";
import type { ActionResult } from "@/lib/ops/errors";
import type { OpsProduct, OpsVariant } from "@/lib/ops/queries";
import { ConfirmDialog } from "./ConfirmDialog";
import { OnlineToggle, PriceCell, StockCell } from "./InlineCells";

type Option = { id: string; name: string };
const IDLE: ActionResult = { ok: true };

function FormMessage({ state }: { state: ActionResult }) {
  if (!state.ok) return <p role="alert" className="rounded bg-clay-100 px-3 py-2 text-[13px] text-clay-600">{state.error}</p>;
  if (state.message) return <p role="status" className="rounded bg-forest-50 px-3 py-2 text-[13px] text-forest-700">{state.message}</p>;
  return null;
}

function Select({ name, label, options, defaultValue, disabled, allowEmpty = "None" }: {
  name: string; label: string; options: Option[]; defaultValue?: string | null; disabled?: boolean; allowEmpty?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="o-label">{label}</label>
      <select id={name} name={name} defaultValue={defaultValue ?? ""} disabled={disabled} className="o-input">
        <option value="">{allowEmpty}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function NewProductForm({ categories, brands, canPrice }: { categories: Option[]; brands: Option[]; canPrice: boolean }) {
  const [state, action, pending] = useActionState(createProduct, IDLE);
  return (
    <form action={action} className="panel max-w-2xl space-y-4 p-5">
      <div>
        <label htmlFor="name" className="o-label">Customer-facing name</label>
        <input id="name" name="name" required maxLength={160} className="o-input" placeholder="e.g. Honey Beans" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select name="category_id" label="Category" options={categories} allowEmpty="Choose later" />
        <Select name="brand_id" label="Brand" options={brands} />
      </div>
      <fieldset>
        <legend className="o-label">Pricing</legend>
        <div className="flex gap-4 text-[13px]">
          <label className="flex items-center gap-2"><input type="radio" name="pricing_type" value="fixed" defaultChecked /> Fixed price</label>
          <label className="flex items-center gap-2"><input type="radio" name="pricing_type" value="variable" /> Variable (priced at the counter)</label>
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="variant_name" className="o-label">First size / variant</label>
          <input id="variant_name" name="variant_name" defaultValue="Standard" maxLength={80} className="o-input" />
          <p className="o-hint">e.g. 4 lbs. Use “Standard” if there is only one.</p>
        </div>
        <div>
          <label htmlFor="price" className="o-label">Price (USD)</label>
          <input id="price" name="price" inputMode="decimal" placeholder={canPrice ? "8.84" : "Requires pricing access"} disabled={!canPrice} className="o-input tabular" />
        </div>
        <div>
          <label htmlFor="sku" className="o-label">SKU</label>
          <input id="sku" name="sku" maxLength={64} className="o-input font-mono" />
        </div>
      </div>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="o-btn o-btn-primary">{pending ? "Creating…" : "Create draft product"}</button>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function ProductDetailsForm({ product, categories, brands, canEdit }: {
  product: OpsProduct; categories: Option[]; brands: Option[]; canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(saveProduct.bind(null, product.id), IDLE);
  const text = (name: keyof OpsProduct, label: string, rows = 3, hint?: string) => (
    <div>
      <label htmlFor={name} className="o-label">{label}</label>
      <textarea id={name} name={name} rows={rows} defaultValue={(product[name] as string | null) ?? ""} disabled={!canEdit} className="o-input" />
      {hint && <p className="o-hint">{hint}</p>}
    </div>
  );

  return (
    <form action={action} className="panel" aria-labelledby="details-title">
      <h2 id="details-title" className="px-4 py-3 font-semibold">Product details</h2>
      <fieldset disabled={!canEdit} className="space-y-4 border-t border-cream-200 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="o-label">Customer-facing name</label>
            <input id="name" name="name" defaultValue={product.name} required maxLength={160} className="o-input" />
          </div>
          <div>
            <label htmlFor="source_name" className="o-label">POS name (read-only)</label>
            <input id="source_name" value={product.source_name ?? "—"} readOnly className="o-input bg-cream-50 text-ink-500" />
          </div>
          <div>
            <label htmlFor="slug" className="o-label">URL name</label>
            <input id="slug" name="slug" defaultValue={product.slug} required maxLength={120} className="o-input font-mono" />
            <p className="o-hint">adisahstore.com/product/<strong>{product.slug}</strong></p>
          </div>
          <div>
            <label htmlFor="search_keywords" className="o-label">Search keywords</label>
            <input id="search_keywords" name="search_keywords" defaultValue={product.search_keywords.join(", ")} className="o-input" />
            <p className="o-hint">Other names customers search for, comma-separated (e.g. garri, ewedu).</p>
          </div>
          <Select name="category_id" label="Category" options={categories} defaultValue={product.category_id} allowEmpty="No category" />
          <Select name="brand_id" label="Brand" options={brands} defaultValue={product.brand_id} />
        </div>

        {text("description", "Description", 4)}
        <div className="grid gap-4 sm:grid-cols-3">
          {text("ingredients", "Ingredients", 3, "Only if known.")}
          {text("usage_notes", "How to use", 3)}
          {text("storage_notes", "Storage", 3)}
        </div>

        <div className="grid gap-4 rounded border border-cream-200 bg-[#faf8f3] p-4 sm:grid-cols-3">
          <div>
            <label htmlFor="status" className="o-label">Status</label>
            <select id="status" name="status" defaultValue={product.status} className="o-input">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label htmlFor="visibility" className="o-label">Website</label>
            <select id="visibility" name="visibility" defaultValue={product.visibility} className="o-input">
              <option value="published">Published online</option>
              <option value="hidden">Hidden online</option>
            </select>
            <p className="o-hint">Shown only when Active and Published.</p>
          </div>
          <div>
            <label htmlFor="pricing_type" className="o-label">Pricing</label>
            <select id="pricing_type" name="pricing_type" defaultValue={product.pricing_type} className="o-input">
              <option value="fixed">Fixed price</option>
              <option value="variable">Variable (not sold online)</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-[13px] sm:col-span-3">
            <input type="checkbox" name="is_featured" defaultChecked={product.is_featured} className="accent-[var(--color-forest-700)]" />
            Feature on the homepage
          </label>
        </div>

        <div className="rounded border border-cream-200 p-4">
          <label className="flex items-center gap-2 text-[13px] font-semibold">
            <input type="checkbox" name="needs_review" defaultChecked={product.needs_review} className="accent-[var(--color-forest-700)]" />
            Needs review
          </label>
          <textarea name="review_notes" rows={2} defaultValue={product.review_notes ?? ""} aria-label="Internal review notes" placeholder="Internal notes (never shown to customers)" className="o-input mt-2" />
        </div>

        <FormMessage state={state} />
        {canEdit && <button type="submit" disabled={pending} className="o-btn o-btn-primary">{pending ? "Saving…" : "Save details"}</button>}
      </fieldset>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function ProductLifecycle({ productId, name, status }: { productId: string; name: string; status: OpsProduct["status"] }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (next: "archived" | "draft") => start(async () => {
    const r = await setProductStatus(productId, next);
    setConfirm(false);
    if (!r.ok) return setError(r.error);
    router.refresh();
  });

  return (
    <section className="panel p-4" aria-labelledby="lifecycle-title">
      <h2 id="lifecycle-title" className="font-semibold">{status === "archived" ? "Archived" : "Archive"}</h2>
      <p className="mt-1 text-[12.5px] text-ink-500">
        {status === "archived"
          ? "This product is retired. Past orders still show it. Restoring brings it back as a hidden draft."
          : "Removes the product from the website and the active catalog. Past orders are unaffected. Nothing is deleted."}
      </p>
      {error && <p role="alert" className="mt-2 text-[12.5px] text-clay-600">{error}</p>}
      {status === "archived" ? (
        <button type="button" onClick={() => run("draft")} disabled={pending} className="o-btn o-btn-secondary mt-3">Restore product</button>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className="o-btn o-btn-danger mt-3">Archive product…</button>
      )}
      <ConfirmDialog
        open={confirm}
        title={`Archive ${name}?`}
        body="It will be hidden from the website immediately and moved out of the active catalog. You can restore it later."
        confirmLabel="Archive product"
        tone="danger"
        pending={pending}
        onConfirm={() => run("archived")}
        onCancel={() => setConfirm(false)}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------

export function VariantRow({ variant: v, productName, pricingType, perms }: {
  variant: OpsVariant;
  productName: string;
  pricingType: OpsProduct["pricing_type"];
  perms: { catalog: boolean; pricing: boolean; inventory: boolean };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [state, action, pending] = useActionState(saveVariant.bind(null, v.id), IDLE);
  const [archiving, start] = useTransition();
  const label = `${productName} — ${v.name}`;
  const archived = !!v.archived_at;

  const toggleArchive = () => start(async () => {
    await setVariantArchived(v.id, !archived);
    setConfirm(false);
    router.refresh();
  });

  return (
    <>
      <tr className={archived ? "opacity-60" : ""}>
        <td>
          <p className="font-medium">{v.name}</p>
          {v.source_name && v.source_name !== v.name && <p className="text-[11.5px] text-ink-500">POS: {v.source_name}</p>}
          {v.needs_review && <p className="mt-0.5 max-w-xs text-[11.5px] text-[#7a5712]">⚑ {v.review_notes ?? "Needs review"}</p>}
        </td>
        <td className="font-mono text-[12px]">{v.sku ?? <span className="text-ink-400">—</span>}</td>
        <td className="text-right"><PriceCell variantId={v.id} label={label} cents={v.regular_price_cents} canEdit={perms.pricing && !archived} variable={pricingType === "variable"} /></td>
        <td><StockCell variantId={v.id} label={label} track={v.track_inventory} quantity={v.stock_quantity} manualStatus={v.manual_stock_status} status={v.stock_status} threshold={v.low_stock_threshold} canEdit={perms.inventory && !archived} /></td>
        <td><OnlineToggle variantId={v.id} label={label} enabled={v.online_enabled} canEdit={perms.catalog && !archived} /></td>
        <td className="whitespace-nowrap text-right">
          {perms.catalog && !archived && <button type="button" onClick={() => setEditing((e) => !e)} className="text-[12.5px] font-semibold text-forest-700 hover:underline" aria-expanded={editing}>{editing ? "Close" : "Edit"}</button>}
          {perms.catalog && archived && <button type="button" onClick={toggleArchive} disabled={archiving} className="text-[12.5px] font-semibold text-forest-700 hover:underline">Restore</button>}
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={6} className="bg-[#faf8f3]">
            <form action={action} className="grid gap-3 py-2 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="o-label" htmlFor={`vn-${v.id}`}>Variant name</label>
                <input id={`vn-${v.id}`} name="name" defaultValue={v.name} required maxLength={80} className="o-input" />
              </div>
              <div>
                <label className="o-label" htmlFor={`vs-${v.id}`}>SKU</label>
                <input id={`vs-${v.id}`} name="sku" defaultValue={v.sku ?? ""} maxLength={64} className="o-input font-mono" />
              </div>
              <fieldset className="text-[12.5px]">
                <legend className="o-label">Fulfillment</legend>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1.5"><input type="checkbox" name="pickup_enabled" defaultChecked={v.pickup_enabled} /> Pickup</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" name="delivery_enabled" defaultChecked={v.delivery_enabled} /> Local delivery</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" name="shipping_enabled" defaultChecked={v.shipping_enabled} /> Shipping</label>
                </div>
              </fieldset>
              <label className="flex items-center gap-2 text-[12.5px] sm:col-span-3">
                <input type="checkbox" name="needs_review" defaultChecked={v.needs_review} /> Needs review
              </label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
                <button type="submit" disabled={pending} className="o-btn o-btn-primary h-8">{pending ? "Saving…" : "Save variant"}</button>
                <button type="button" onClick={() => setConfirm(true)} className="o-btn o-btn-danger ml-auto h-8">Archive variant…</button>
              </div>
              <div className="sm:col-span-3"><FormMessage state={state} /></div>
            </form>
            <ConfirmDialog
              open={confirm}
              title={`Archive ${v.name}?`}
              body="It will stop being sold online. Past orders keep their record of it. You can restore it later."
              confirmLabel="Archive variant"
              tone="danger"
              pending={archiving}
              onConfirm={toggleArchive}
              onCancel={() => setConfirm(false)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

export function AddVariantForm({ productId, canPrice }: { productId: string; canPrice: boolean }) {
  const [state, action, pending] = useActionState(addVariant.bind(null, productId), IDLE);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 border-t border-cream-200 px-4 py-3">
      <div className="w-40">
        <label htmlFor="new-variant-name" className="o-label">Add a size / variant</label>
        <input id="new-variant-name" name="name" required maxLength={80} placeholder="e.g. 10 lbs" className="o-input" />
      </div>
      <div className="w-28">
        <label htmlFor="new-variant-price" className="o-label">Price</label>
        <input id="new-variant-price" name="price" inputMode="decimal" disabled={!canPrice} placeholder={canPrice ? "22.99" : "—"} className="o-input tabular" />
      </div>
      <div className="w-36">
        <label htmlFor="new-variant-sku" className="o-label">SKU</label>
        <input id="new-variant-sku" name="sku" maxLength={64} className="o-input font-mono" />
      </div>
      <button type="submit" disabled={pending} className="o-btn o-btn-secondary">{pending ? "Adding…" : "Add variant"}</button>
      <div className="basis-full"><FormMessage state={state} /></div>
    </form>
  );
}
