import type { Metadata } from "next";
import Link from "next/link";
import { EmptyRow, PageHeader } from "@/components/ops/PageHeader";
import { requireStaff } from "@/lib/ops/auth";
import { opsPath } from "@/lib/ops/paths";
import { listActivity, OPS_PAGE_SIZE } from "@/lib/ops/queries";

export const metadata: Metadata = { title: "Activity log" };

const ENTITIES = [
  ["", "Everything"], ["product_variants", "Prices & stock"], ["products", "Products"], ["promotions", "Promotions"],
  ["orders", "Orders"], ["staff_members", "Staff"], ["store_settings", "Settings"],
] as const;

function renderValue(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff("audit.read");
  const sp = await searchParams;
  const entity = ENTITIES.find(([k]) => k === sp.entity)?.[0] ?? "";
  const { entries, total, page } = await listActivity({ entity: entity || undefined, page: Number(sp.page) || 1 });
  const pages = Math.max(1, Math.ceil(total / OPS_PAGE_SIZE));
  const href = (over: Record<string, string>) => `${opsPath("/activity")}?${new URLSearchParams(Object.entries({ entity, ...over }).filter(([, v]) => v))}`;

  return (
    <>
      <PageHeader title="Activity log" description="Every change to products, prices, stock, orders, staff and settings is recorded automatically and cannot be edited." />
      <nav aria-label="Filter activity" className="mb-3 flex flex-wrap gap-1">
        {ENTITIES.map(([k, label]) => (
          <Link key={k} href={href({ entity: k, page: "" })} aria-current={entity === k ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ${entity === k ? "bg-forest-800 text-white" : "bg-white text-ink-700 ring-1 ring-cream-300"}`}>{label}</Link>
        ))}
      </nav>
      <div className="panel overflow-x-auto">
        <table className="o-table">
          <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
          <tbody>
            {entries.length === 0 && <EmptyRow colSpan={4}>No activity recorded yet.</EmptyRow>}
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-ink-500">{new Date(e.occurred_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="whitespace-nowrap"><p>{e.actor_email ?? "system"}</p>{e.actor_role && <p className="text-[11.5px] text-ink-500">{e.actor_role}</p>}</td>
                <td className="min-w-[16rem]">{e.summary}</td>
                <td className="text-[12px] text-ink-500">
                  {e.changes && (
                    <details>
                      <summary className="cursor-pointer">{Object.keys(e.changes).length} field{Object.keys(e.changes).length > 1 ? "s" : ""}</summary>
                      <dl className="mt-1 space-y-0.5 font-mono">
                        {Object.entries(e.changes as Record<string, { from: unknown; to: unknown }>).map(([k, c]) => (
                          <div key={k}><dt className="inline font-semibold">{k}:</dt> <dd className="inline">{renderValue(c.from)} → {renderValue(c.to)}</dd></div>
                        ))}
                      </dl>
                    </details>
                  )}
                </td>
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
