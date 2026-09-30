import { OPS_NAV, OPS_UPCOMING } from "@/components/ops/nav";
import { Sidebar } from "@/components/ops/Sidebar";
import { signOutStaff } from "@/lib/ops/actions";
import { requireStaff } from "@/lib/ops/auth";
import { can } from "@/lib/ops/permissions";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Authoritative gate for the whole portal. Each page checks its own
  // permission too, and the database enforces access again underneath.
  const staff = await requireStaff();
  const items = OPS_NAV.filter((i) => can(staff, i.permission));

  return (
    <div className="min-h-dvh">
      <Sidebar
        items={items}
        upcoming={OPS_UPCOMING}
        staffName={staff.displayName ?? staff.email ?? "Staff member"}
        roleName={staff.roleName}
        signOut={signOutStaff}
      />
      <div className="lg:pl-56">
        <main className="mx-auto max-w-[90rem] px-3 py-5 sm:px-6 sm:py-7">{children}</main>
      </div>
    </div>
  );
}
