import Link from "next/link";

// Deliberately generic: identical in tone to any missing page, and it
// reveals nothing about what might exist at this address.
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#fcf9f3] px-6 text-center">
      <h1 className="font-display text-3xl text-forest-900">Page not found</h1>
      <p className="text-ink-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="o-btn o-btn-primary mt-2">Go to the homepage</Link>
    </div>
  );
}
