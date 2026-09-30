"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { opsPath } from "@/lib/ops/paths";
import type { OpsNavItem } from "./nav";

const ICONS: Record<OpsNavItem["icon"], React.ReactNode> = {
  dashboard: <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" />,
  products: <path d="M4 8l8-4 8 4-8 4-8-4Zm0 0v8l8 4 8-4V8M12 12v8" />,
  inventory: <path d="M4 20V9l8-5 8 5v11M8 20v-6h8v6M8 17h8" />,
  orders: <path d="M6 4h12v16l-3-2-3 2-3-2-3 2V4Zm3 5h6M9 13h6" />,
  activity: <path d="M3 12h4l3-7 4 14 3-7h4" />,
};

export function Sidebar({ items, upcoming, staffName, roleName, signOut }: {
  items: OpsNavItem[];
  upcoming: string[];
  staffName: string;
  roleName: string;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="Store operations" className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <LogoMark size={30} />
        <div className="leading-tight">
          <p className="font-display text-[1.05rem] tracking-wide text-cream-50">ADISAH</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-400">Store operations</p>
        </div>
      </div>
      <ul className="mt-2 space-y-0.5 px-2">
        {items.map((item) => {
          const href = opsPath(item.href);
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={item.href}>
              <Link href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                className={`flex h-9 items-center gap-2.5 rounded px-3 text-[13px] font-medium transition-colors ${
                  active ? "bg-forest-700 text-white" : "text-cream-200/85 hover:bg-forest-800 hover:text-white"}`}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[item.icon]}</svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {upcoming.length > 0 && (
        <div className="mt-6 px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cream-200/40">Coming next</p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] text-cream-200/40">{upcoming.map((u) => <li key={u}>{u}</li>)}</ul>
        </div>
      )}
      <div className="mt-auto border-t border-forest-800 p-3">
        <p className="truncate px-1 text-[13px] font-medium text-cream-50">{staffName}</p>
        <p className="px-1 text-[11.5px] text-cream-200/60">{roleName}</p>
        <form action={signOut}>
          <button type="submit" className="mt-2 w-full rounded px-1 py-1.5 text-left text-[12.5px] text-cream-200/80 hover:bg-forest-800 hover:text-white">Sign out</button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-12 items-center gap-2 bg-forest-950 px-2 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 w-10 items-center justify-center rounded text-cream-50 hover:bg-forest-800" aria-label="Open navigation" aria-expanded={open}>
          <MenuIcon size={22} />
        </button>
        <span className="font-display text-cream-50">ADISAH</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-400">Operations</span>
      </div>

      <aside className="fixed inset-y-0 left-0 hidden w-56 bg-forest-950 lg:block">{nav}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-forest-950/50" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-forest-950">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-2 top-3 inline-flex h-9 w-9 items-center justify-center rounded text-cream-50 hover:bg-forest-800" aria-label="Close navigation">
              <CloseIcon size={20} />
            </button>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
