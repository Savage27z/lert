"use client";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl text-forest-900">Something went wrong</h1>
      <p className="mt-3 text-ink-700">Sorry about that. Please try again — if it keeps happening, give us a call.</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6">Try again</button>
    </div>
  );
}
