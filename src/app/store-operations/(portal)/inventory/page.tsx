import type { Metadata } from "next";
import Link from "next/link";
import { StockCell } from "@/components/ops/InlineCells";
import { EmptyRow, PageHeader } from "@/components/ops/PageHeader";
import { requireStaff } from "@/lib/ops/auth";
import { opsPath } from "@/lib/ops/paths";
import { can } from "@/lib/ops/permissions";
import { listInventory, OPS_PAGE_SIZE } from "@/lib/ops/queries";

export const metadata: Metadata = { title: "Inventory" };

const TABS = [
  { value: "", label: "All" },
  { value: "out_of_stock", label: "Sold out" },
  { value: "low_stock", label: "Low stock" },
  { value: "in_stock", label: "In stock" },
  { value: "untracked", label: "Count not tracked" },
];

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff("catalog.read");
  const sp = await searchParams;
  const stock = TABS.find((t) => t.value === sp.stock)?.value ?? "";
  const { rows, total, page } = await listInventory({ q: sp.q?.slice(0, 80), stock, page: Number(sp.page) || 1 });
  const pages = Math.max(1, Math.ceil(total / OPS_PAGE_SIZE));
  const canEdit = can(staff, "inventory.write");
  const href = (over: Record<string, string>) => {
    const p = new URLSearchParams(Object.entries({ q: sp.q ?? "", stock, ...over }).filter(([, v]) => v));
    return `${opsPath("/inventory")}?${p}`;
  };

  return (
    <>
      <PageHeader title="Inventory" description="Stock levels per variant. Tracked items sell out automatically at 0; untracked items use the status you set." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <nav aria-label="Stock filter" className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <Link key={t.value} href={href({ stock: t.value, page: "" })} aria-current={stock === t.value ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ${stock === t.value ? "bg-forest-800 text-white" : "bg-white text-ink-700 ring-1 ring-cream-300 hover:ring-ink-400"}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <form method="get" className="ml-auto flex gap-2" role="search">
          {stock && <input type="hidden" name="stock" value={stock} />}
          <label htmlFor="inv-q" className="sr-only">Search inventory</label>
          <input id="inv-q" name="q" defaultValue={sp.q} placeholder="Search products or SKU" className="o-input w-56" />
          <button type="submit" className="o-btn o-btn-secondary">Search</button>
        </form>
      </div>

      <div className="panel overflow-x-auto">
        <table className="o-table">
          <thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Stock</th><th>Online</th></tr></thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={5}>No matching inventory.</EmptyRow>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={opsPath(`/products/${r.product.id}`)} className="font-medium hover:underline">{r.product.name}</Link></td>
                <td>{r.name}</td>
                <td className="font-mono text-[12px]">{r.sku ?? "—"}</td>
                <td>
                  <StockCell variantId={r.id} label={`${r.product.name} — ${r.name}`} track={r.track_inventory} quantity={r.stock_quantity}
                    manualStatus={r.manual_stock_status} status={r.stock_status} threshold={r.low_stock_threshold} canEdit={canEdit} />
                </td>
                <td className="text-[12.5px] text-ink-500">{r.online_enabled && r.product.visibility === "published" && r.product.status === "active" ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-3 flex items-center justify-end gap-2 text-[13px]">
          {page > 1 && <Link href={href({ page: String(page - 1) })} className="o-btn o-btn-secondary">Previous</Link>}
          <span className="text-ink-500 tabular">Page {page} of {pages}</span>
          {page < pages && <Link href={href({ page: String(page + 1) })} className="o-btn o-btn-secondary">Next</Link>}
        </nav>
      )}
    </>
  );
}
