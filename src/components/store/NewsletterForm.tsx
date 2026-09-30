"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/app/(store)/actions";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeToNewsletter, { status: "idle" });
  return (
    <form action={action} className="w-full max-w-md" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input id="newsletter-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com"
          className="h-12 flex-1 rounded border-[1.5px] border-forest-700 bg-forest-950/30 px-4 text-cream-50 placeholder:text-cream-200/60 focus:border-gold-400 focus:outline-none" />
        {/* honeypot */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <button type="submit" disabled={pending} className="btn btn-gold h-12">{pending ? "Joining…" : "Join the list"}</button>
      </div>
      <p role="status" aria-live="polite" className={`mt-2 min-h-5 text-sm ${state.status === "error" ? "text-gold-200" : "text-cream-200"}`}>
        {state.message}
      </p>
    </form>
  );
}
