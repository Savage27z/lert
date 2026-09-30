"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { opsPath } from "@/lib/ops/paths";
import { createClient } from "@/lib/supabase/browser";

type Mode =
  | { kind: "loading" }
  | { kind: "verify"; factorId: string }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "error"; message: string };

/**
 * Staff roles require an authenticator-app code (TOTP) on every sign-in.
 * First sign-in enrolls the app; afterwards a 6-digit code is requested.
 */
export function MfaStep() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return setMode({ kind: "error", message: "Couldn't load verification. Refresh to try again." });
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) return setMode({ kind: "verify", factorId: verified.id });

      // Clear any half-finished enrollment, then start a fresh one.
      for (const f of data.all.filter((f) => f.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `ADISAH ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrollError || !enrolled) return setMode({ kind: "error", message: "Couldn't start setup. Refresh to try again." });
      setMode({ kind: "enroll", factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
    })();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode.kind !== "verify" && mode.kind !== "enroll") return;
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code from your authenticator app.");
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: mode.factorId, code });
    if (error) {
      setPending(false);
      return setError(error.status === 429 ? "Too many attempts. Wait a minute and try again." : "That code didn't work. Check the time on your phone and try again.");
    }
    router.replace(opsPath("/dashboard"));
    router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace(opsPath());
    router.refresh();
  }

  if (mode.kind === "loading") return <p className="mt-6 text-center text-[13px] text-ink-500">Loading…</p>;
  if (mode.kind === "error") return <p role="alert" className="mt-6 rounded bg-clay-100 px-3 py-2 text-[13px] text-clay-600">{mode.message}</p>;

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      {mode.kind === "enroll" && (
        <div className="space-y-3 text-[13px] text-ink-700">
          <p>Scan this code with an authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URI SVG from the auth server */}
          <img src={mode.qr} alt="Authenticator setup QR code" width={180} height={180} className="mx-auto rounded border border-cream-200 bg-white p-2" />
          <details className="text-[12px]">
            <summary className="cursor-pointer text-ink-500">Can&apos;t scan? Enter this key instead</summary>
            <code className="mt-1 block break-all rounded bg-cream-100 p-2 font-mono text-[12px]">{mode.secret}</code>
          </details>
        </div>
      )}
      <div>
        <label htmlFor="code" className="o-label">Verification code</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus
          className="o-input h-11 text-center font-mono text-lg tracking-[0.4em]" />
      </div>
      {error && <p role="alert" className="rounded bg-clay-100 px-3 py-2 text-[13px] text-clay-600">{error}</p>}
      <button type="submit" disabled={pending} className="o-btn o-btn-primary h-10 w-full">{pending ? "Verifying…" : "Verify"}</button>
      <button type="button" onClick={signOut} className="w-full text-center text-[12px] text-ink-500 hover:underline">Sign out</button>
    </form>
  );
}
