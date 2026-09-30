"use client";

import Link from "next/link";
import { useRef } from "react";

interface Props {
  action: string;
  q?: string;
  sort: string;
  category?: string;
  showCategoryField: boolean;
  categories: { slug: string; name: string; product_count: number; href: string }[];
  allHref: string;
  brands: { slug: string; name: string; count: number }[];
  selectedBrands: string[];
  inStock: boolean;
  onSale: boolean;
  autoSubmit?: boolean;
  idPrefix: string;
}

/**
 * Filter form using plain GET params, so filtered pages are linkable and work
 * without JavaScript. On desktop it applies instantly; in the mobile sheet the
 * shopper taps "Show results".
 */
export function FilterForm(props: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => { if (props.autoSubmit) formRef.current?.requestSubmit(); };
  const box = "h-[1.1rem] w-[1.1rem] rounded-sm border-cream-300 accent-[var(--color-forest-700)]";

  return (
    <form ref={formRef} action={props.action} method="get" className="space-y-7">
      {props.q && <input type="hidden" name="q" value={props.q} />}
      {props.sort !== "featured" && <input type="hidden" name="sort" value={props.sort} />}
      {props.showCategoryField && props.category && <input type="hidden" name="category" value={props.category} />}

      <fieldset>
        <legend className="kicker mb-3">Category</legend>
        <ul className="space-y-0.5 text-[0.92rem]">
          <li>
            <Link href={props.allHref} className={`flex min-h-10 items-center justify-between rounded px-2 hover:bg-cream-100 ${!props.category ? "font-semibold text-forest-800" : "text-ink-700"}`} aria-current={!props.category ? "page" : undefined}>
              All products
            </Link>
          </li>
          {props.categories.map((c) => (
            <li key={c.slug}>
              <Link href={c.href} className={`flex min-h-10 items-center justify-between gap-2 rounded px-2 hover:bg-cream-100 ${props.category === c.slug ? "bg-forest-50 font-semibold text-forest-800" : "text-ink-700"}`} aria-current={props.category === c.slug ? "page" : undefined}>
                <span>{c.name}</span><span className="text-xs text-ink-400 tabular">{c.product_count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="kicker mb-3">Availability</legend>
        <label className="flex min-h-10 cursor-pointer items-center gap-3 px-2 text-[0.92rem]">
          <input type="checkbox" name="stock" value="1" defaultChecked={props.inStock} onChange={submit} className={box} />
          In stock only
        </label>
        <label className="flex min-h-10 cursor-pointer items-center gap-3 px-2 text-[0.92rem]">
          <input type="checkbox" name="sale" value="1" defaultChecked={props.onSale} onChange={submit} className={box} />
          On sale
        </label>
      </fieldset>

      {props.brands.length > 0 && (
        <fieldset>
          <legend className="kicker mb-3">Brand</legend>
          <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
            {props.brands.map((b) => (
              <label key={b.slug} className="flex min-h-10 cursor-pointer items-center gap-3 px-2 text-[0.92rem]">
                <input type="checkbox" name="brand" value={b.slug} defaultChecked={props.selectedBrands.includes(b.slug)} onChange={submit} className={box} id={`${props.idPrefix}-brand-${b.slug}`} />
                <span className="flex-1">{b.name}</span>
                <span className="text-xs text-ink-400 tabular">{b.count}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={props.autoSubmit ? "sr-only" : "sticky bottom-0 -mx-4 border-t border-cream-200 bg-cream-50 p-4"}>
        <button type="submit" className="btn btn-primary w-full">Show results</button>
      </div>
    </form>
  );
}
