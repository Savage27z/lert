import { formatCents } from "@/lib/money";

export function PriceTag({
  priceCents,
  regularCents,
  from = false,
  variable = false,
  size = "md",
}: {
  priceCents: number | null;
  regularCents?: number | null;
  from?: boolean;
  variable?: boolean;
  size?: "md" | "lg";
}) {
  if (variable || priceCents == null) {
    return <span className="text-sm font-semibold text-ink-500">Price varies</span>;
  }
  const onSale = regularCents != null && priceCents < regularCents;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`price-tag ${size === "lg" ? "text-xl" : "text-[0.95rem]"}`} data-sale={onSale}>
        {from && <span className="text-[0.7em] font-semibold uppercase tracking-wide opacity-75">From</span>}
        {formatCents(priceCents)}
      </span>
      {onSale && (
        <s className="text-sm text-ink-400 tabular" aria-label={`Regular price ${formatCents(regularCents)}`}>
          {formatCents(regularCents)}
        </s>
      )}
    </span>
  );
}
