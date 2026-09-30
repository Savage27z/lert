import type { Metadata } from "next";
import Link from "next/link";
import { EmptyRow, PageHeader } from "@/components/ops/PageHeader";
import { StatusPills } from "@/components/ops/StatusPills";
import { requireStaff } from "@/lib/ops/auth";
import { opsPath } from "@/lib/ops/paths";
import { can } from "@/lib/ops/permissions";
import { getDashboard } from "@/lib/ops/queries";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Dashboard" };

function Metric({ label, value, href, tone = "default" }: { label: string; value: string | number; href?: string; tone?: "default" | "warn" | "bad" }) {
  const body = (
    <>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">{label}</p>
      <p className={`mt-1 font-display text-[1.9rem] leading-none tabular ${tone === "bad" ? "text-clay-600" : tone === "warn" ? "text-gold-600" : "text-forest-900"}`}>{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="panel block p-4 transition-colors hover:border-forest-700">{body}</Link>
  ) : <div className="panel p-4">{body}</div>;
}

const dateTime = (s: string) => new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function DashboardPage() {
  const staff = await requireStaff("catalog.read");
  const d = await getDashboard(can(staff, "orders.read"), can(staff, "audit.read"));
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <PageHeader
        title={`Welcome${staff.displayName ? `, ${staff.displayName.split(" ")[0]}` : ""}`}
        description={today}
        actions={
          <>
            {can(staff, "catalog.write") && <Link href={opsPath("/products/new")} className="o-btn o-btn-primary">Add product</Link>}
            <Link href={opsPath("/products")} className="o-btn o-btn-secondary">Update prices</Link>
            <Link href={opsPath("/inventory")} className="o-btn o-btn-secondary">Update inventory</Link>
          </>
        }
      />

      <section aria-label="Catalog" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Metric label="Products" value={d.catalog.total} href={opsPath("/products")} />
        <Metric label="Live online" value={d.catalog.online} href={opsPath("/products?visibility=published")} />
        <Metric label="Sold out variants" value={d.catalog.outOfStockVariants} href={opsPath("/inventory?stock=out_of_stock")} tone={d.catalog.outOfStockVariants ? "bad" : "default"} />
        <Metric label="Low stock variants" value={d.catalog.lowStockVariants} href={opsPath("/inventory?stock=low_stock")} tone={d.catalog.lowStockVariants ? "warn" : "default"} />
        <Metric label="Needs review" value={d.catalog.needsReview} href={opsPath("/products?review=1")} tone={d.catalog.needsReview ? "warn" : "default"} />
      </section>

      {d.orders && (
        <section aria-label="Orders" className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Revenue this month" value={formatCents(d.orders.revenueThisMonthCents)} />
          <Metric label="Orders to fulfill" value={d.orders.pending} href={opsPath("/orders")} tone={d.orders.pending ? "warn" : "default"} />
          <Metric label="Completed orders" value={d.orders.completed} />
          <Metric label="All orders" value={d.orders.total} href={opsPath("/orders")} />
        </section>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {d.orders && (
          <section className="panel overflow-hidden" aria-labelledby="recent-orders">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 id="recent-orders" className="font-semibold">Recent orders</h2>
              <Link href={opsPath("/orders")} className="text-[12.5px] font-semibold text-forest-700 hover:underline">All orders</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="o-table">
                <thead><tr><th>Order</th><th>Customer</th><th className="text-right">Total</th><th>Status</th><th>Placed</th></tr></thead>
                <tbody>
                  {d.orders.latest.length === 0 && <EmptyRow colSpan={5}>No orders yet. Online orders will appear here once checkout opens.</EmptyRow>}
                  {d.orders.latest.map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono text-[12.5px]">#{o.order_number}</td>
                      <td>{o.customer_name}</td>
                      <td className="text-right tabular">{formatCents(o.total_cents)}</td>
                      <td><StatusPills payment={o.payment_status} fulfillment={o.fulfillment_status} /></td>
                      <td className="text-ink-500">{dateTime(o.placed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="panel" aria-labelledby="needs-review">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 id="needs-review" className="font-semibold">Needs review <span className="text-ink-400">({d.catalog.needsReview})</span></h2>
            <Link href={opsPath("/products?review=1")} className="text-[12.5px] font-semibold text-forest-700 hover:underline">Review all</Link>
          </div>
          <ul className="divide-y divide-[#f0ebe0] border-t border-cream-200">
            {d.needsReview.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-ink-500">Nothing flagged. Nice.</li>}
            {d.needsReview.map((p) => (
              <li key={p.id}>
                <Link href={opsPath(`/products/${p.id}`)} className="block px-4 py-2.5 hover:bg-[#fcfbf7]">
                  <p className="font-medium">{p.name}</p>
                  {p.review_notes && <p className="line-clamp-1 text-[12.5px] text-ink-500">{p.review_notes}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-labelledby="recently-updated">
          <h2 id="recently-updated" className="px-4 py-3 font-semibold">Recently updated products</h2>
          <ul className="divide-y divide-[#f0ebe0] border-t border-cream-200">
            {d.recent.map((p) => (
              <li key={p.id}>
                <Link href={opsPath(`/products/${p.id}`)} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#fcfbf7]">
                  <span className="font-medium">{p.name}</span>
                  <span className="shrink-0 text-[12px] text-ink-500">{dateTime(p.updated_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {can(staff, "audit.read") && (
          <section className="panel" aria-labelledby="activity">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 id="activity" className="font-semibold">Latest activity</h2>
              <Link href={opsPath("/activity")} className="text-[12.5px] font-semibold text-forest-700 hover:underline">Activity log</Link>
            </div>
            <ul className="divide-y divide-[#f0ebe0] border-t border-cream-200">
              {d.activity.map((a) => (
                <li key={a.id} className="px-4 py-2.5">
                  <p className="text-[13px]">{a.summary}</p>
                  <p className="text-[12px] text-ink-500">{a.actor_email ?? "system"} · {dateTime(a.occurred_at)}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
