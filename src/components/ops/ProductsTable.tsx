"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bulkSetVisibility } from "@/lib/ops/actions";
import { opsPath } from "@/lib/ops/paths";
import type { OpsProduct } from "@/lib/ops/queries";
import { ConfirmDialog } from "./ConfirmDialog";
import { OnlineToggle, PriceCell, StockCell } from "./InlineCells";
import { EmptyRow } from "./PageHeader";
import { ProductStatusPill } from "./StatusPills";

export function ProductsTable({ products, perms }: {
  products: OpsProduct[];
  perms: { catalog: boolean; pricing: boolean; inventory: boolean };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<"published" | "hidden" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));

  const runBulk = () => {
    if (!bulk) return;
    start(async () => {
      const r = await bulkSetVisibility([...selected], bulk);
      setBulk(null);
      if (!r.ok) return setNotice(r.error);
      setNotice(`${r.data?.count ?? 0} product${r.data?.count === 1 ? "" : "s"} ${bulk === "published" ? "published" : "hidden"}.`);
      setSelected(new Set());
      router.refresh();
    });
  };

  return (
    <div className="panel overflow-hidden">
      {perms.catalog && (
        <div className={`flex flex-wrap items-center gap-2 border-b border-cream-200 px-3 py-2 ${selected.size ? "bg-forest-50" : ""}`}>
          <span className="text-[12.5px] text-ink-700">{selected.size ? `${selected.size} selected` : "Select products for bulk actions"}</span>
          {selected.size > 0 && (
            <>
              <button type="button" onClick={() => setBulk("published")} className="o-btn o-btn-secondary h-8">Publish online</button>
              <button type="button" onClick={() => setBulk("hidden")} className="o-btn o-btn-secondary h-8">Hide from website</button>
              <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-[12.5px] text-ink-500 hover:underline">Clear</button>
            </>
          )}
          {notice && <span role="status" className="ml-auto text-[12.5px] font-medium text-forest-700">{notice}</span>}
        </div>
      )}
      <div className="max-h-[calc(100dvh-15rem)] overflow-auto">
        <table className="o-table">
          <thead>
            <tr>
              {perms.catalog && (
                <th className="w-8"><input type="checkbox" aria-label="Select all on this page" checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)))} className="accent-[var(--color-forest-700)]" /></th>
              )}
              <th>Product</th><th>Variant</th><th>SKU</th><th className="text-right">Price</th><th>Stock</th><th>Online</th><th>Status</th><th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && <EmptyRow colSpan={9}>No matching products. Try a different search or clear the filters.</EmptyRow>}
            {products.map((p) => {
              const variants = p.variants.filter((v) => !v.archived_at);
              const rows = variants.length ? variants : [null];
              return rows.map((v, i) => (
                <tr key={v?.id ?? p.id} className={i > 0 ? "[&>td]:border-t-0" : ""}>
                  {perms.catalog && (
                    <td>{i === 0 && <input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="accent-[var(--color-forest-700)]" />}</td>
                  )}
                  <td className="min-w-[12rem]">
                    {i === 0 && (
                      <div>
                        <Link href={opsPath(`/products/${p.id}`)} className="font-semibold text-ink-900 hover:text-forest-700 hover:underline">{p.name}</Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-500">
                          {p.category?.name ?? <span className="text-gold-600">No category</span>}
                          {p.brand && <span>· {p.brand.name}</span>}
                          {p.needs_review && <span className="pill pill-gold">Review</span>}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{v ? v.name : <span className="text-clay-600">No variants — add sizes &amp; prices</span>}{v?.needs_review && <span className="ml-1.5 pill pill-gold">Review</span>}</td>
                  <td className="font-mono text-[12px] text-ink-700">{v?.sku ?? <span className="text-ink-400">—</span>}</td>
                  <td className="text-right">{v && <PriceCell variantId={v.id} label={`${p.name} — ${v.name}`} cents={v.regular_price_cents} canEdit={perms.pricing} variable={p.pricing_type === "variable"} />}</td>
                  <td>{v && <StockCell variantId={v.id} label={`${p.name} — ${v.name}`} track={v.track_inventory} quantity={v.stock_quantity} manualStatus={v.manual_stock_status} status={v.stock_status} threshold={v.low_stock_threshold} canEdit={perms.inventory} />}</td>
                  <td>{v && <OnlineToggle variantId={v.id} label={`${p.name} — ${v.name}`} enabled={v.online_enabled} canEdit={perms.catalog} />}</td>
                  <td>{i === 0 && <ProductStatusPill status={p.status} visibility={p.visibility} />}</td>
                  <td className="text-right">{i === 0 && <Link href={opsPath(`/products/${p.id}`)} className="text-[12.5px] font-semibold text-forest-700 hover:underline">Edit</Link>}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={bulk != null}
        title={bulk === "published" ? `Publish ${selected.size} products?` : `Hide ${selected.size} products?`}
        body={bulk === "published"
          ? "They will appear on the website right away (only variants that are enabled online and priced can be bought). Archived products are skipped."
          : "They will disappear from the website right away. Nothing is deleted and you can publish them again later."}
        confirmLabel={bulk === "published" ? "Publish" : "Hide"}
        pending={pending}
        onConfirm={runBulk}
        onCancel={() => setBulk(null)}
      />
    </div>
  );
}
