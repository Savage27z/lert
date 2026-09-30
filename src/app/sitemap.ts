import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getSitemapData } from "@/lib/storefront/queries";

// Public storefront URLs only. Store Operations routes are never listed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const staticPages = ["", "/shop", "/categories", "/specials", "/about", "/contact"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "daily" as const,
  }));
  try {
    const data = await getSitemapData();
    return [
      ...staticPages,
      ...data.categories.map((slug) => ({ url: `${base}/categories/${slug}`, changeFrequency: "daily" as const })),
      ...data.products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updated_at })),
    ];
  } catch {
    return staticPages;
  }
}

export const dynamic = "force-dynamic";
