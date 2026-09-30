import type { Permission } from "@/lib/ops/permissions";

export interface OpsNavItem {
  href: string;
  label: string;
  permission: Permission;
  icon: "dashboard" | "products" | "inventory" | "orders" | "activity";
}

// Only built sections appear. Each is also gated server-side on the page.
export const OPS_NAV: OpsNavItem[] = [
  { href: "/dashboard", label: "Dashboard", permission: "catalog.read", icon: "dashboard" },
  { href: "/products", label: "Products", permission: "catalog.read", icon: "products" },
  { href: "/inventory", label: "Inventory", permission: "catalog.read", icon: "inventory" },
  { href: "/orders", label: "Orders", permission: "orders.read", icon: "orders" },
  { href: "/activity", label: "Activity log", permission: "audit.read", icon: "activity" },
];

// Planned sections, shown greyed out so staff know what's coming.
export const OPS_UPCOMING = ["Promotions", "Customers", "Reports", "Store settings", "Staff & roles"];
