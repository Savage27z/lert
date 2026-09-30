"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({ open, title, body, confirmLabel, tone = "primary", pending, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="o-dialog" onCancel={(e) => { e.preventDefault(); onCancel(); }} aria-labelledby="confirm-title">
      <div className="p-5">
        <h2 id="confirm-title" className="text-[15px] font-semibold">{title}</h2>
        <div className="mt-2 text-[13px] leading-relaxed text-ink-700">{body}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="o-btn o-btn-secondary" autoFocus>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={pending} className={`o-btn ${tone === "danger" ? "o-btn-danger-solid" : "o-btn-primary"}`}>
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
