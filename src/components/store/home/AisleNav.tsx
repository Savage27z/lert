import Link from "next/link";
import { AisleIcon } from "@/components/icons";
import { categoryTint } from "@/components/store/ProductImage";
import type { CategorySummary } from "@/lib/storefront/types";

/** Categories presented as numbered store aisles. Scrolls sideways on phones. */
export function AisleNav({ categories }: { categories: CategorySummary[] }) {
  return (
    <ul className="scroll-row -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:grid-cols-4 lg:grid-cols-6">
      {categories.map((c, i) => (
        <li key={c.slug} className="w-[9.5rem] shrink-0 sm:w-auto">
          <Link
            href={`/categories/${c.slug}`}
            className="group flex h-full flex-col rounded-[var(--radius-card)] border border-cream-200 bg-white p-3 transition-colors hover:border-forest-700"
          >
            <span className={`flex aspect-[4/3] items-center justify-center rounded ${categoryTint(c.slug)}`}>
              <AisleIcon slug={c.slug} size={44} className="transition-transform group-hover:-translate-y-0.5" />
            </span>
            <span className="mt-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-gold-600 tabular">
              Aisle {String(i + 1).padStart(2, "0")}
            </span>
            <span className="mt-0.5 text-[0.95rem] font-medium leading-snug text-ink-900">{c.name}</span>
            <span className="mt-auto pt-1 text-xs text-ink-500">{c.product_count} {c.product_count === 1 ? "item" : "items"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
