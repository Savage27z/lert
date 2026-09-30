// Mirrors public.permissions. The database is the authority; these constants
// only drive what the UI offers. Hiding a button is never the protection.
export const PERMISSIONS = [
  "catalog.read",
  "catalog.write",
  "pricing.write",
  "inventory.write",
  "promotions.write",
  "orders.read",
  "orders.write",
  "customers.read",
  "reports.read",
  "audit.read",
  "settings.write",
  "staff.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface StaffContext {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: string;
  roleName: string;
  permissions: Permission[];
}

export const can = (staff: Pick<StaffContext, "permissions">, p: Permission) => staff.permissions.includes(p);
