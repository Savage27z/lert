"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setVariantOnline, updateVariantPrice, updateVariantStock } from "@/lib/ops/actions";
import { formatCents, parseDollarsToCents } from "@/lib/money";
import { ConfirmDialog } from "./ConfirmDialog";
import { StockPill } from "./StatusPills";

const LARGE_CHANGE = 0.3; // confirm price changes of 30% or more

export function PriceCell({ variantId, label, cents, canEdit, variable }: {
  variantId: string;
  label: string;
  cents: number | null;
  canEdit: boolean;
  variable?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(cents != null ? (cents / 100).toFixed(2) : "");
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [pending, start] = useTransition();

  if (variable && cents == null) return <span className="text-ink-500">Variable</span>;
  if (!editing) {
    return canEdit ? (
      <button type="button" onClick={() => setEditing(true)} className="group -mx-1.5 rounded px-1.5 py-1 text-right tabular hover:bg-cream-100" aria-label={`Edit price for ${label}, currently ${formatCents(cents)}`}>
        {cents == null ? <span className="text-clay-600">Set price</span> : formatCents(cents)}
        <span className="ml-1 text-[11px] text-ink-400 opacity-0 group-hover:opacity-100">Edit</span>
      </button>
    ) : <span className="tabular">{formatCents(cents)}</span>;
  }

  const save = (force = false) => {
    const next = parseDollarsToCents(value);
    if (next == null || next <= 0) return setError("Enter a price like 14.75");
    if (next === cents) return setEditing(false);
    if (!force && cents != null && Math.abs(next - cents) / cents >= LARGE_CHANGE) return setConfirm(next);
    setConfirm(null);
    start(async () => {
      const r = await updateVariantPrice(variantId, value);
      if (!r.ok) return setError(r.error);
      setError(null);
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex items-center gap-1">
        <span className="text-ink-500">$</span>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); setError(null); } }}
          inputMode="decimal"
          aria-label={`New price for ${label}`}
          aria-invalid={!!error}
          className="o-input h-8 w-20 text-right tabular"
        />
        <button type="submit" disabled={pending} className="o-btn o-btn-primary h-8 px-2.5">{pending ? "…" : "Save"}</button>
        <button type="button" onClick={() => { setEditing(false); setError(null); setValue(cents != null ? (cents / 100).toFixed(2) : ""); }} className="o-btn o-btn-secondary h-8 px-2">Cancel</button>
      </form>
      {error && <p role="alert" className="text-[12px] text-clay-600">{error}</p>}
      <ConfirmDialog
        open={confirm != null}
        title="Confirm a large price change"
        body={<>Change <strong>{label}</strong> from <strong>{formatCents(cents)}</strong> to <strong>{formatCents(confirm)}</strong>? The new price shows on the website immediately. Past orders keep their original prices.</>}
        confirmLabel="Change price"
        pending={pending}
        onConfirm={() => save(true)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

export function StockCell({ variantId, label, track, quantity, manualStatus, status, threshold, canEdit }: {
  variantId: string;
  label: string;
  track: boolean;
  quantity: number | null;
  manualStatus: "in_stock" | "low_stock" | "out_of_stock";
  status: string;
  threshold: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [trackInv, setTrackInv] = useState(track);
  const [qty, setQty] = useState(quantity?.toString() ?? "");
  const [manual, setManual] = useState(manualStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const summary = (
    <span className="inline-flex items-center gap-2">
      {track ? <span className="w-8 text-right font-semibold tabular">{quantity}</span> : <span className="w-8 text-right text-ink-400" title="Stock count not tracked">—</span>}
      <StockPill status={status} />
    </span>
  );

  if (!editing) {
    return canEdit ? (
      <button type="button" onClick={() => setEditing(true)} className="-mx-1.5 rounded px-1.5 py-1 hover:bg-cream-100" aria-label={`Edit stock for ${label}`}>{summary}</button>
    ) : summary;
  }

  const save = () => {
    const n = qty.trim() === "" ? null : Number(qty);
    if (trackInv && (n == null || !Number.isInteger(n) || n < 0)) return setError("Enter a whole number (0 or more).");
    start(async () => {
      const r = await updateVariantStock(variantId, { trackInventory: trackInv, quantity: trackInv ? n : n ?? null, manualStatus: manual });
      if (!r.ok) return setError(r.error);
      setEditing(false);
      setError(null);
      router.refresh();
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex min-w-[15rem] flex-col gap-2 rounded border border-cream-300 bg-white p-2.5 shadow-sm">
      <label className="flex items-center gap-2 text-[12.5px]">
        <input type="checkbox" checked={trackInv} onChange={(e) => setTrackInv(e.target.checked)} className="accent-[var(--color-forest-700)]" />
        Track quantity (sells out automatically at 0)
      </label>
      {trackInv ? (
        <div className="flex items-center gap-2">
          <input autoFocus value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" aria-label={`Quantity on hand for ${label}`} className="o-input h-8 w-20 tabular" />
          <span className="text-[12px] text-ink-500">on hand · low at {threshold}</span>
        </div>
      ) : (
        <select value={manual} onChange={(e) => setManual(e.target.value as typeof manual)} aria-label={`Stock status for ${label}`} className="o-input h-8">
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Sold out</option>
        </select>
      )}
      {error && <p role="alert" className="text-[12px] text-clay-600">{error}</p>}
      <div className="flex gap-1.5">
        <button type="submit" disabled={pending} className="o-btn o-btn-primary h-8">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={() => setEditing(false)} className="o-btn o-btn-secondary h-8">Cancel</button>
      </div>
    </form>
  );
}

export function OnlineToggle({ variantId, label, enabled, canEdit }: { variantId: string; label: string; enabled: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Sell ${label} online`}
        disabled={!canEdit || pending}
        onClick={() => {
          const next = !on;
          setOn(next);
          start(async () => {
            const r = await setVariantOnline(variantId, next);
            if (!r.ok) { setOn(!next); setError(r.error); } else { setError(null); router.refresh(); }
          });
        }}
        className={`relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? "bg-forest-700" : "bg-cream-300"}`}
      >
        <span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
      {error && <span role="alert" className="mt-1 text-[11px] text-clay-600">{error}</span>}
    </span>
  );
}
