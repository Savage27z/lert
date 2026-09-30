import type { NextRequest } from "next/server";
import { OPS_BASE_PATH } from "@/lib/ops/paths";
import { refreshSession } from "@/lib/supabase/session";

/**
 * Runs before every page request:
 *  - keeps the Supabase auth session fresh (token refresh -> cookies)
 *  - marks all Store Operations responses no-index / no-store, including
 *    404s served for unauthorized visitors
 * Authorization itself happens server-side in the Store Operations layout
 * (requireStaff) and again in the database via RLS.
 */
export async function proxy(request: NextRequest) {
  const { response } = await refreshSession(request);
  const path = request.nextUrl.pathname;
  if (path === OPS_BASE_PATH || path.startsWith(`${OPS_BASE_PATH}/`)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)"],
};
