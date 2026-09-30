import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { opsPath } from "./paths";
import { can, type Permission, type StaffContext } from "./permissions";

type Resolution =
  | { state: "signed_out" }
  | { state: "not_staff" }
  | { state: "mfa_required"; email: string | null }
  | { state: "ok"; staff: StaffContext };

/**
 * Resolves the current request's staff access by asking the database
 * (public.staff_context), which checks the staff_members table, the role, the
 * account's active flag and the session's MFA level. Never trusts cookies,
 * user metadata, or anything else the browser controls.
 */
export const resolveStaff = cache(async (): Promise<Resolution> => {
  const supabase = await createClient();
  // getUser() re-validates the session with the auth server.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { state: "signed_out" };

  const { data, error } = await supabase.rpc("staff_context");
  if (error) {
    console.error("[ops] staff_context failed", error.message);
    return { state: "not_staff" };
  }
  if (!data) return { state: "not_staff" };

  const ctx = data as {
    user_id: string; display_name: string | null; role: string; role_name: string;
    mfa_required: boolean; permissions: Permission[];
  };
  if (ctx.mfa_required) return { state: "mfa_required", email: user.email ?? null };

  return {
    state: "ok",
    staff: {
      userId: ctx.user_id,
      email: user.email ?? null,
      displayName: ctx.display_name,
      role: ctx.role,
      roleName: ctx.role_name,
      permissions: ctx.permissions,
    },
  };
});

/**
 * Gate for every Store Operations page and action. Anyone who is not an
 * active staff member gets a plain 404 — the same response as any unknown
 * URL — so the portal's existence is not confirmed.
 */
export async function requireStaff(permission?: Permission): Promise<StaffContext> {
  const r = await resolveStaff();
  if (r.state === "mfa_required") redirect(opsPath("/verify"));
  if (r.state !== "ok") notFound();
  if (permission && !can(r.staff, permission)) notFound();
  return r.staff;
}

/** For server actions: returns an error result instead of redirecting. */
export async function staffForAction(permission: Permission): Promise<StaffContext | null> {
  const r = await resolveStaff();
  if (r.state !== "ok" || !can(r.staff, permission)) return null;
  return r.staff;
}
