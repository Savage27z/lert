"use client";

import { MinusIcon, PlusIcon } from "@/components/icons";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  size = "md",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-9" : "h-11";
  const w = size === "sm" ? "w-9" : "w-11";
  return (
    <div className={`inline-flex ${h} items-stretch overflow-hidden rounded border-[1.5px] border-cream-300 bg-white`} role="group" aria-label={label}>
      <button type="button" className={`${w} inline-flex items-center justify-center text-forest-900 hover:bg-cream-100 disabled:opacity-40`} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <MinusIcon size={16} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.floor(n))));
        }}
        className="w-10 border-x border-cream-200 text-center text-[0.95rem] font-semibold tabular [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Quantity"
      />
      <button type="button" className={`${w} inline-flex items-center justify-center text-forest-900 hover:bg-cream-100 disabled:opacity-40`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <PlusIcon size={16} />
      </button>
    </div>
  );
}
