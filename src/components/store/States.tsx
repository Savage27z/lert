import Link from "next/link";
import { AlertIcon, SearchIcon } from "@/components/icons";

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-cream-300 bg-white/60 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream-100 text-forest-700"><SearchIcon size={26} /></span>
      <h2 className="mt-4 font-display text-2xl text-forest-900">{title}</h2>
      {body && <p className="mt-2 max-w-md text-sm text-ink-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function CatalogUnavailable() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <AlertIcon size={32} className="mx-auto text-clay-600" />
      <h1 className="mt-4 font-display text-3xl text-forest-900">We&apos;re restocking the shelves</h1>
      <p className="mt-3 text-ink-700">Our catalog is temporarily unavailable. Please refresh in a moment.</p>
      <Link href="/" className="btn btn-primary mt-6">Try again</Link>
    </div>
  );
}
