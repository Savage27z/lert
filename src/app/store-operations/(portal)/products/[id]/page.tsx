import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ops/PageHeader";
import { AddVariantForm, ProductDetailsForm, ProductLifecycle, VariantRow } from "@/components/ops/ProductForms";
import { ProductStatusPill } from "@/components/ops/StatusPills";
import { requireStaff } from "@/lib/ops/auth";
import { opsPath } from "@/lib/ops/paths";
import { can } from "@/lib/ops/permissions";
import { getOpsProduct, getPriceHistory, listTaxonomy } from "@/lib/ops/queries";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const staff = await requireStaff("catalog.read");
  const { id } = await params;
  const { created } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [product, taxonomy] = await Promise.all([getOpsProduct(id), listTaxonomy()]);
  if (!product) notFound();

  const canPricing = can(staff, "pricing.write");
  const history = canPricing || can(staff, "reports.read") ? await getPriceHistory(product.variants.map((v) => v.id)) : [];
  const variantName = new Map(product.variants.map((v) => [v.id, v.name]));
  const active = product.variants.filter((v) => !v.archived_at);
  const archived = product.variants.filter((v) => v.archived_at);
  const perms = { catalog: can(staff, "catalog.write"), pricing: canPricing, inventory: can(staff, "inventory.write") };

  return (
    <>
      <Link href={opsPath("/products")} className="text-[12.5px] text-ink-500 hover:underline">← Products</Link>
      <PageHeader
        title={product.name}
        description={product.source_name && product.source_name !== product.name ? `POS name: ${product.source_name}` : undefined}
        actions={
          <>
            <ProductStatusPill status={product.status} visibility={product.visibility} />
            {product.status === "active" && product.visibility === "published" && (
              <a href={`/product/${product.slug}`} target="_blank" rel="noopener" className="o-btn o-btn-secondary h-8">View on website ↗</a>
            )}
          </>
        }
      />
      {created && <p role="status" className="mb-4 rounded bg-forest-50 px-3 py-2 text-[13px] text-forest-700">Product created as a hidden draft. Add details, then set it to Active and Published when it&apos;s ready.</p>}
      {product.needs_review && product.review_notes && (
        <div className="mb-4 rounded border border-gold-200 bg-gold-100 px-4 py-3 text-[13px] text-[#6b4c0f]">
          <p className="font-semibold">Needs review</p>
          <p className="mt-0.5">{product.review_notes}</p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <section className="panel" aria-labelledby="variants-title">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 id="variants-title" className="font-semibold">Sizes, prices &amp; stock</h2>
              <span className="text-[12px] text-ink-500">{product.pricing_type === "variable" ? "Variable price (not sold online)" : "Fixed price"}</span>
            </div>
            <div className="overflow-x-auto border-t border-cream-200">
              <table className="o-table">
                <thead><tr><th>Variant</th><th>SKU</th><th className="text-right">Price</th><th>Stock</th><th>Online</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {active.length === 0 && <tr><td colSpan={6} className="!py-6 text-center text-[13px] text-clay-600">No variants yet — add one below so this product can be sold.</td></tr>}
                  {active.map((v) => <VariantRow key={v.id} variant={v} productName={product.name} pricingType={product.pricing_type} perms={perms} />)}
                </tbody>
              </table>
            </div>
            {perms.catalog && <AddVariantForm productId={product.id} canPrice={canPricing} />}
            {archived.length > 0 && (
              <details className="border-t border-cream-200 px-4 py-3 text-[13px]">
                <summary className="cursor-pointer text-ink-500">{archived.length} archived variant{archived.length > 1 ? "s" : ""}</summary>
                <table className="o-table mt-2"><tbody>
                  {archived.map((v) => <VariantRow key={v.id} variant={v} productName={product.name} pricingType={product.pricing_type} perms={perms} />)}
                </tbody></table>
              </details>
            )}
          </section>

          <ProductDetailsForm product={product} categories={taxonomy.categories} brands={taxonomy.brands} canEdit={perms.catalog} />
        </div>

        <aside className="space-y-5">
          {perms.catalog && <ProductLifecycle productId={product.id} name={product.name} status={product.status} />}
          {(canPricing || can(staff, "reports.read")) && (
            <section className="panel" aria-labelledby="history-title">
              <h2 id="history-title" className="px-4 py-3 font-semibold">Price history</h2>
              <ul className="max-h-96 divide-y divide-[#f0ebe0] overflow-y-auto border-t border-cream-200">
                {history.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-ink-500">No price changes yet.</li>}
                {history.map((h) => (
                  <li key={h.id} className="px-4 py-2.5 text-[13px]">
                    <p><span className="font-medium">{variantName.get(h.variant_id)}</span>: {h.previous_price_cents == null ? "set to" : <>{formatCents(h.previous_price_cents)} →</>} <strong className="tabular">{formatCents(h.new_price_cents)}</strong></p>
                    <p className="text-[12px] text-ink-500">{h.changed_by_email ?? "Initial import"} · {new Date(h.changed_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
