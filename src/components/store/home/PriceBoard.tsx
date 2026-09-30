import Link from "next/link";
import { formatCents } from "@/lib/money";
import type { ProductCard } from "@/lib/storefront/types";

/** Market price board: real products and current prices from the catalog. */
export function PriceBoard({ products }: { products: ProductCard[] }) {
  const rows = products.filter((p) => p.price_min_cents != null).slice(0, 7);
  if (rows.length === 0) return null;
  return (
    <aside aria-labelledby="price-board-title" className="relative overflow-hidden rounded-[var(--radius-card)] bg-forest-900 p-5 text-cream-50 shadow-[var(--shadow-lift)] sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 selvedge opacity-80" />
      <div className="flex items-baseline justify-between gap-4 pt-2">
        <h2 id="price-board-title" className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-gold-400">
          On the shelf today
        </h2>
        <span className="text-[0.7rem] text-cream-200/60">Current prices</span>
      </div>
      <ul className="mt-4 space-y-1">
        {rows.map((p) => {
          const size = p.variant_count > 1 ? `${p.variant_count} sizes` : p.quick_add_variant_name !== "Standard" ? p.quick_add_variant_name : null;
          return (
            <li key={p.id}>
              <Link href={`/product/${p.slug}`} className="group flex items-end py-1.5">
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg leading-tight text-cream-50 group-hover:text-gold-200 sm:text-xl">{p.name}</span>
                  {size && <span className="block text-xs text-cream-200/60">{size}</span>}
                </span>
                <span className="leader" aria-hidden="true" />
                <span className="shrink-0 font-semibold tabular text-gold-400 sm:text-lg">
                  {p.variant_count > 1 && p.price_min_cents !== p.price_max_cents && <span className="mr-1 text-xs font-medium text-cream-200/70">from</span>}
                  {formatCents(p.price_min_cents)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/shop" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold-400 underline-offset-4 hover:underline">
        See every price →
      </Link>
    </aside>
  );
}
