import { notFound, redirect } from "next/navigation";
import { LogoMark } from "@/components/brand/Logo";
import { MfaStep } from "@/components/ops/MfaStep";
import { resolveStaff } from "@/lib/ops/auth";
import { opsPath } from "@/lib/ops/paths";

export default async function VerifyPage() {
  const r = await resolveStaff();
  if (r.state === "ok") redirect(opsPath("/dashboard"));
  if (r.state !== "mfa_required") notFound();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-forest-950 px-4 py-10">
      <div className="panel w-full max-w-sm p-7">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={40} />
          <h1 className="mt-4 font-display text-2xl text-forest-900">Two-step verification</h1>
          <p className="mt-1 text-[13px] text-ink-500">Signed in as {r.email}</p>
        </div>
        <MfaStep />
      </div>
    </div>
  );
}
