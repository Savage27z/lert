"use client";

import { useRef } from "react";
import { CloseIcon, SlidersIcon } from "@/components/icons";

export function MobileFilters({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="btn btn-outline h-11 lg:hidden">
        <SlidersIcon size={18} /> Filter{activeCount > 0 && <span className="rounded-full bg-forest-800 px-1.5 text-xs text-cream-50 tabular">{activeCount}</span>}
      </button>
      <dialog
        ref={ref}
        className="sheet mt-auto w-full"
        aria-labelledby="filters-title"
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      >
        <div className="flex max-h-[85dvh] flex-col rounded-t-xl bg-cream-50">
          <div className="flex items-center justify-between border-b border-cream-200 px-4 py-2">
            <h2 id="filters-title" className="font-display text-xl text-forest-900">Filter</h2>
            <button type="button" onClick={() => ref.current?.close()} className="inline-flex h-11 w-11 items-center justify-center rounded hover:bg-cream-100" aria-label="Close filters">
              <CloseIcon size={22} />
            </button>
          </div>
          <div className="overflow-y-auto px-4 pt-4">{children}</div>
        </div>
      </dialog>
    </>
  );
}
