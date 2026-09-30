/** "+13014549363" -> "(301) 454-9363". Falls back to the input unchanged. */
export function formatUsPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

export function telHref(e164: string): string {
  return `tel:${e164.replace(/[^+\d]/g, "")}`;
}
