import type { StockStatus } from "@/lib/storefront/types";

const LABELS: Record<StockStatus, { text: string; dot: string }> = {
  in_stock: { text: "In stock", dot: "bg-forest-600" },
  low_stock: { text: "Low stock", dot: "bg-gold-500" },
  out_of_stock: { text: "Sold out", dot: "bg-ink-400" },
};

export function StockNote({ status, className = "" }: { status: StockStatus; className?: string }) {
  const l = LABELS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-ink-700 ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${l.dot}`} aria-hidden="true" />
      {l.text}
    </span>
  );
}
