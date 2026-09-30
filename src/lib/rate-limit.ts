import "server-only";

/**
 * Best-effort, per-instance sliding-window limiter. Good enough to blunt
 * casual abuse of public forms; for multi-instance production traffic, back
 * this with a shared store (e.g. Upstash Redis or a Postgres table).
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) buckets.clear();
  return true;
}
