"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { CloseIcon } from "@/components/icons";
import { cartDrawer } from "@/lib/client/ui-events";
import { CartView } from "./CartView";

export function CartDrawer({ phone, phoneHref }: { phone: string | null; phoneHref: string | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => cartDrawer.onOpen(() => {
    if (window.location.pathname !== "/cart") ref.current?.showModal();
  }), []);
  useEffect(() => { ref.current?.close(); }, [pathname]);

  return (
    <dialog
      ref={ref}
      className="sheet ml-auto h-dvh w-full sm:w-[26rem]"
      aria-labelledby="cart-drawer-title"
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
    >
      <div className="flex h-full flex-col bg-cream-50">
        <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3">
          <h2 id="cart-drawer-title" className="font-display text-2xl text-forest-900">Your cart</h2>
          <button type="button" onClick={() => ref.current?.close()} className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-cream-100" aria-label="Close cart">
            <CloseIcon size={22} />
          </button>
        </div>
        <CartView variant="drawer" phone={phone} phoneHref={phoneHref} onNavigate={() => ref.current?.close()} />
      </div>
    </dialog>
  );
}
