import { notFound, redirect } from "next/navigation";
import { LogoMark } from "@/components/brand/Logo";
import { StaffSignIn } from "@/components/ops/StaffSignIn";
import { resolveStaff } from "@/lib/ops/auth";
import { opsPath } from "@/lib/ops/paths";

export default async function StaffEntry() {
  const r = await resolveStaff();
  if (r.state === "ok") redirect(opsPath("/dashboard"));
  if (r.state === "mfa_required") redirect(opsPath("/verify"));
  // A signed-in customer gets the same 404 as any unknown address.
  if (r.state === "not_staff") notFound();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-forest-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="panel p-7">
          <div className="flex flex-col items-center text-center">
            <LogoMark size={44} />
            <h1 className="mt-4 font-display text-2xl text-forest-900">Staff sign in</h1>
            <p className="mt-1 text-[13px] text-ink-500">Authorized personnel only. Access is logged.</p>
          </div>
          <StaffSignIn />
        </div>
      </div>
    </div>
  );
}
