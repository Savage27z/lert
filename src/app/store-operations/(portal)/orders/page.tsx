import type { Metadata } from "next";
import { EmptyRow, PageHeader } from "@/components/ops/PageHeader";
import { StatusPills } from "@/components/ops/StatusPills";
import { requireStaff } from "@/lib/ops/auth";
import { listOrders } from "@/lib/ops/queries";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Orders" };

const METHOD: Record<string, string> = { pickup: "Pickup", local_delivery: "Local delivery", shipping: "Shipping" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff("orders.read");
  const sp = await searchParams;
  const { orders, total } = await listOrders({ q: sp.q, status: sp.status, page: Number(sp.page) || 1 });

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"}`} />
      <form method="get" className="mb-3 flex flex-wrap gap-2" role="search">
        <label htmlFor="order-q" className="sr-only">Search orders</label>
        <input id="order-q" name="q" defaultValue={sp.q} placeholder="Order number, customer name or email" className="o-input w-72" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Fulfillment status" className="o-input w-auto">
          <option value="">Any status</option>
          <option value="unfulfilled">Unfulfilled</option>
          <option value="processing">Processing</option>
          <option value="ready_for_pickup">Ready for pickup</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="submit" className="o-btn o-btn-secondary">Apply</button>
      </form>
      <div className="panel overflow-x-auto">
        <table className="o-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Method</th><th className="text-right">Total</th><th>Status</th><th>Placed</th></tr></thead>
          <tbody>
            {orders.length === 0 && (
              <EmptyRow colSpan={6}>
                {sp.q || sp.status ? "No orders match these filters." : "No orders yet. Orders will appear here once online checkout is switched on."}
              </EmptyRow>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="font-mono text-[12.5px]">#{o.order_number}</td>
                <td><p>{o.customer_name}</p><p className="text-[12px] text-ink-500">{o.email}</p></td>
                <td>{METHOD[o.fulfillment_method] ?? o.fulfillment_method}</td>
                <td className="text-right tabular">{formatCents(o.total_cents)}</td>
                <td><StatusPills payment={o.payment_status} fulfillment={o.fulfillment_status} /></td>
                <td className="whitespace-nowrap text-ink-500">{new Date(o.placed_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
