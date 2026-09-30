import Link from "next/link";
import { SearchForm } from "@/components/store/SearchForm";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
      <p className="kicker justify-center">Page not found</p>
      <h1 className="mt-3 font-display text-4xl text-forest-900">This shelf is empty</h1>
      <p className="mt-3 text-ink-700">The page you&apos;re looking for has moved or doesn&apos;t exist. Try a search instead.</p>
      <div className="mx-auto mt-6 max-w-sm text-left"><SearchForm id="search-404" /></div>
      <Link href="/" className="btn btn-outline mt-6">Back to the homepage</Link>
    </div>
  );
}
