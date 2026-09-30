/** ADISAH wordmark with a sprig mark (two leaves forming an "A"). */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <circle cx="20" cy="20" r="19" fill="var(--color-forest-800)" />
      <path d="M20 31V14" stroke="var(--color-gold-400)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 22c-5-.4-8.2-4.4-7.6-9.8 5.1.6 8 4.4 7.6 9.8Z" fill="var(--color-gold-400)" />
      <path d="M20 26.5c5.4-.4 8.6-4.6 8-10.2-5.4.6-8.4 4.6-8 10.2Z" fill="var(--color-gold-500)" />
      <path d="M13.5 31h13" stroke="var(--color-cream-100)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ tone = "dark", compact = false }: { tone?: "dark" | "light"; compact?: boolean }) {
  const main = tone === "dark" ? "text-forest-900" : "text-cream-50";
  const sub = tone === "dark" ? "text-gold-600" : "text-gold-400";
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={compact ? 32 : 38} />
      <span className="flex flex-col leading-none">
        <span className={`font-display tracking-[0.06em] ${compact ? "text-[1.35rem]" : "text-[1.6rem]"} ${main}`}>
          ADISAH
        </span>
        <span className={`mt-1 text-[0.58rem] font-semibold tracking-[0.34em] ${sub}`}>AFRICAN STORE</span>
      </span>
    </span>
  );
}
