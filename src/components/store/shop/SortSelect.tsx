"use client";

import { SORT_OPTIONS } from "@/lib/storefront/types";

export function SortSelect({ action, hidden, value }: {
  action: string;
  hidden: [string, string][];
  value: string;
}) {
  return (
    <form action={action} method="get" className="flex items-center gap-2">
      {hidden.map(([k, v], i) => <input key={`${k}-${i}`} type="hidden" name={k} value={v} />)}
      <label htmlFor="sort" className="hidden text-sm text-ink-500 sm:block">Sort</label>
      <select
        id="sort"
        name="sort"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-11 rounded border-[1.5px] border-cream-300 bg-white pl-3 pr-8 text-sm font-medium focus:border-forest-700 focus:outline-none"
      >
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <noscript><button type="submit" className="btn btn-outline h-11">Sort</button></noscript>
    </form>
  );
}
