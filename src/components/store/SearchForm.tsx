import { SearchIcon } from "@/components/icons";

/** Plain GET form: works without JavaScript and keeps results shareable. */
export function SearchForm({ defaultValue = "", id = "site-search" }: { defaultValue?: string; id?: string }) {
  return (
    <form action="/shop" method="get" role="search" className="relative w-full">
      <label htmlFor={id} className="sr-only">Search products</label>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search Milo, honey beans, suya spice…"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={80}
        className="h-11 w-full rounded border-[1.5px] border-cream-300 bg-white pl-4 pr-12 text-[0.95rem] placeholder:text-ink-400 focus:border-forest-700 focus:outline-none focus:ring-[3px] focus:ring-forest-700/15"
      />
      <button
        type="submit"
        className="absolute right-1 top-1 inline-flex h-9 w-10 items-center justify-center rounded-sm bg-forest-800 text-cream-50 hover:bg-forest-900"
        aria-label="Search"
      >
        <SearchIcon size={18} />
      </button>
    </form>
  );
}
