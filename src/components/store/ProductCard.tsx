import Link from "next/link";
import type { ProductCard as Card } from "@/lib/storefront/types";
import { QuickAddButton } from "./AddToCartButton";
import { PriceTag } from "./Price";
import { ProductImage } from "./ProductImage";
import { WishlistButton } from "./WishlistButton";

export function ProductCard({ product, priority = false }: { product: Card; priority?: boolean }) {
  const soldOut = product.stock_status === "out_of_stock";
  const multi = product.variant_count > 1;
  const sizeLabel = multi
    ? `${product.variant_count} sizes`
    : product.quick_add_variant_name && product.quick_add_variant_name !== "Standard"
      ? product.quick_add_variant_name
      : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-cream-200 bg-white transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-square overflow-hidden bg-cream-50">
        <ProductImage
          image={product.image}
          name={product.name}
          brand={product.brand}
          categorySlug={product.category?.slug}
          priority={priority}
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {product.on_sale && !soldOut && (
            <span className="rounded-sm bg-clay-600 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">
              Sale
            </span>
          )}
          {soldOut && (
            <span className="rounded-sm bg-ink-900/80 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">
              Sold out
            </span>
          )}
        </div>
        <WishlistButton productId={product.id} productName={product.name} className="absolute right-1 top-1 bg-white/85" />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-3.5">
        {product.brand && (
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-ink-500">{product.brand}</p>
        )}
        <h3 className="line-clamp-2 text-[0.95rem] font-medium leading-snug text-ink-900">
          <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        {sizeLabel && <p className="text-xs text-ink-500">{sizeLabel}</p>}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-2 pt-2">
          <PriceTag
            priceCents={product.price_min_cents}
            regularCents={product.regular_price_cents}
            from={multi && product.price_min_cents !== product.price_max_cents}
            variable={product.pricing_type === "variable"}
          />
          <QuickAddButton
            variantId={product.quick_add_variant_id}
            productSlug={product.slug}
            productName={product.name}
            purchasable={product.purchasable}
            variantCount={product.variant_count}
          />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Card[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
