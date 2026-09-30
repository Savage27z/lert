"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { CloseIcon, MenuIcon, PhoneIcon } from "@/components/icons";
import { Logo } from "@/components/brand/Logo";
import type { CategorySummary } from "@/lib/storefront/types";
import { NAV_LINKS } from "./nav";

export function MobileMenu({ categories, phone, phoneHref }: {
  categories: CategorySummary[];
  phone: string | null;
  phoneHref: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex h-11 w-11 items-center justify-center rounded text-forest-900 hover:bg-cream-100 lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon size={24} />
      </button>
      <dialog
        ref={ref}
        className="sheet h-dvh w-[min(22rem,88vw)]"
        aria-label="Site menu"
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      >
        <div className="flex h-full flex-col overflow-y-auto bg-cream-50">
          <div className="selvedge" />
          <div className="flex items-center justify-between px-4 py-3">
            <Logo compact />
            <button type="button" onClick={() => ref.current?.close()} className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-cream-100" aria-label="Close menu">
              <CloseIcon size={22} />
            </button>
          </div>
          <nav aria-label="Main" className="px-2">
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-12 items-center rounded px-3 font-display text-xl text-forest-900 hover:bg-cream-100" aria-current={pathname === l.href ? "page" : undefined}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li><Link href="/account" className="flex min-h-12 items-center rounded px-3 font-display text-xl text-forest-900 hover:bg-cream-100">Account</Link></li>
              <li><Link href="/wishlist" className="flex min-h-12 items-center rounded px-3 font-display text-xl text-forest-900 hover:bg-cream-100">Wishlist</Link></li>
            </ul>
          </nav>
          {categories.length > 0 && (
            <div className="mt-4 border-t border-cream-200 px-5 pt-4">
              <p className="kicker">Aisles</p>
              <ul className="mt-2">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/categories/${c.slug}`} className="flex min-h-11 items-center justify-between text-[0.95rem] text-ink-700 hover:text-forest-800">
                      {c.name}<span className="text-xs text-ink-400 tabular">{c.product_count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {phone && phoneHref && (
            <a href={phoneHref} className="mx-4 mb-6 mt-auto flex min-h-12 items-center gap-3 rounded bg-forest-800 px-4 text-cream-50">
              <PhoneIcon size={20} /> <span>Call {phone}</span>
            </a>
          )}
        </div>
      </dialog>
    </>
  );
}
