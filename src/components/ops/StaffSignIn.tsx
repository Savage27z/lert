"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { opsPath } from "@/lib/ops/paths";
import { createClient } from "@/lib/supabase/browser";

const GENERIC = "Email or password is incorrect.";

export function StaffSignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
    });
    if (authError) {
      setPending(false);
      // Supabase rate-limits sign-in attempts; surface that plainly, otherwise stay generic.
      setError(authError.status === 429 ? "Too many attempts. Wait a few minutes and try again." : GENERIC);
      return;
    }
    // Only staff may continue; anyone else is signed straight back out.
    const { data: ctx } = await supabase.rpc("staff_context");
    if (!ctx) {
      await supabase.auth.signOut();
      setPending(false);
      setError(GENERIC);
      return;
    }
    router.replace(ctx.mfa_required ? opsPath("/verify") : opsPath("/dashboard"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="o-label">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="o-input h-10" />
      </div>
      <div>
        <label htmlFor="password" className="o-label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="o-input h-10" />
      </div>
      {error && <p role="alert" className="rounded bg-clay-100 px-3 py-2 text-[13px] text-clay-600">{error}</p>}
      <button type="submit" disabled={pending} className="o-btn o-btn-primary h-10 w-full">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
