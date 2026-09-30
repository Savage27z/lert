const PAYMENT: Record<string, [string, string]> = {
  unpaid: ["Unpaid", "pill-grey"], pending: ["Payment pending", "pill-gold"], paid: ["Paid", "pill-green"],
  failed: ["Payment failed", "pill-clay"], refunded: ["Refunded", "pill-grey"], partially_refunded: ["Part refunded", "pill-gold"],
};
const FULFILLMENT: Record<string, [string, string]> = {
  unfulfilled: ["Unfulfilled", "pill-grey"], processing: ["Processing", "pill-gold"], ready_for_pickup: ["Ready for pickup", "pill-blue"],
  shipped: ["Shipped", "pill-blue"], delivered: ["Delivered", "pill-green"], cancelled: ["Cancelled", "pill-clay"],
};

export function StatusPills({ payment, fulfillment }: { payment: string; fulfillment: string }) {
  const p = PAYMENT[payment] ?? [payment, "pill-grey"];
  const f = FULFILLMENT[fulfillment] ?? [fulfillment, "pill-grey"];
  return (
    <span className="flex flex-wrap gap-1">
      <span className={`pill ${p[1]}`}>{p[0]}</span>
      <span className={`pill ${f[1]}`}>{f[0]}</span>
    </span>
  );
}

export function StockPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    in_stock: ["In stock", "pill-green"], low_stock: ["Low stock", "pill-gold"], out_of_stock: ["Sold out", "pill-clay"],
  };
  const [label, cls] = map[status] ?? [status, "pill-grey"];
  return <span className={`pill ${cls}`}>{label}</span>;
}

export function ProductStatusPill({ status, visibility }: { status: string; visibility: string }) {
  if (status === "archived") return <span className="pill pill-grey">Archived</span>;
  if (status === "draft") return <span className="pill pill-gold">Draft</span>;
  return visibility === "published" ? <span className="pill pill-green">Live</span> : <span className="pill pill-grey">Hidden</span>;
}
