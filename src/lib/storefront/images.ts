import { env } from "@/lib/env";

export const PRODUCT_IMAGE_BUCKET = "product-images";

/** Public URL for an object in the product image bucket. */
export function productImageUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${env.supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path.replace(/^\//, "")}`;
}
