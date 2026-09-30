import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Deliberately does NOT mention the Store Operations path: listing it here
// would advertise it. Those routes send `X-Robots-Tag: noindex` instead and
// require authentication.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/cart", "/account", "/wishlist"] }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
