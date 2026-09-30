"use client";

import { useState } from "react";
import { ProductImage } from "@/components/store/ProductImage";
import type { ImageRef } from "@/lib/storefront/types";

export function Gallery({ images, name, brand, categorySlug }: {
  images: ImageRef[];
  name: string;
  brand: string | null;
  categorySlug?: string;
}) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? null;
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] border border-cream-200 bg-white">
        <ProductImage image={current} name={name} brand={brand} categorySlug={categorySlug} large priority sizes="(min-width: 1024px) 45vw, 100vw" />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.path}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                className={`relative h-16 w-16 overflow-hidden rounded border-[1.5px] bg-white ${i === index ? "border-forest-800" : "border-cream-200"}`}
              >
                <ProductImage image={img} name={name} sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
