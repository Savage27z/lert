import Image from "next/image";
import { AisleIcon } from "@/components/icons";
import { productImageUrl } from "@/lib/storefront/images";
import type { ImageRef } from "@/lib/storefront/types";

const TINTS: Record<string, string> = {
  "rice-grains": "bg-gold-100 text-gold-600",
  "beans-legumes": "bg-clay-100 text-clay-600",
  "flours-swallow": "bg-cream-100 text-ink-500",
  "spices-seasonings": "bg-clay-100 text-clay-600",
  "pastes-canned": "bg-clay-100 text-clay-600",
  "breakfast-beverages": "bg-gold-100 text-gold-600",
  snacks: "bg-gold-100 text-gold-600",
  "vegetables-leaves": "bg-forest-50 text-forest-700",
  "meat-fish": "bg-cream-100 text-ink-500",
  "herbal-bitters": "bg-forest-50 text-forest-700",
  "beauty-personal-care": "bg-cream-100 text-ink-500",
  "kitchen-household": "bg-cream-100 text-ink-500",
};

export function categoryTint(slug?: string | null) {
  return TINTS[slug ?? ""] ?? "bg-cream-100 text-ink-500";
}

/**
 * Product photo, or — until real photography is uploaded — a clean "shelf
 * label" placeholder built from the product's own data (never stock imagery).
 */
export function ProductImage({
  image,
  name,
  brand,
  categorySlug,
  sizes = "(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw",
  priority = false,
  large = false,
}: {
  image: ImageRef | null | undefined;
  name: string;
  brand?: string | null;
  categorySlug?: string | null;
  sizes?: string;
  priority?: boolean;
  large?: boolean;
}) {
  if (image) {
    return (
      <Image
        src={productImageUrl(image.path)}
        alt={image.alt || name}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain p-3"
      />
    );
  }
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center ${categoryTint(categorySlug)}`}
      role="img"
      aria-label={`${name} — photo coming soon`}
    >
      <AisleIcon slug={categorySlug ?? undefined} size={large ? 88 : 48} className="opacity-70" />
      {large && (
        <span className="max-w-[16rem] font-display text-2xl leading-tight text-forest-900">{name}</span>
      )}
      {brand && (
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] opacity-80">{brand}</span>
      )}
    </div>
  );
}
