import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"
import ErrorBoundary, {
  ProductCardErrorFallback,
} from "@modules/common/components/error-boundary"

export default async function ProductRail({
  collection,
  category,
  region,
  eyebrow,
  title,
  countryCode,
  limit = 8,
}: {
  collection?: HttpTypes.StoreCollection
  category?: HttpTypes.StoreProductCategory
  region: HttpTypes.StoreRegion
  eyebrow?: string
  title?: string
  countryCode?: string
  limit?: number
}) {
  const queryParams: Record<string, any> = {
    limit,
    fields: "*variants.calculated_price",
  }

  if (collection?.id) {
    queryParams.collection_id = collection.id
  }

  if (category?.id) {
    queryParams.category_id = [category.id]
  }

  const {
    response: { products: pricedProducts },
  } = await listProducts({
    regionId: region.id,
    queryParams,
  })

  if (!pricedProducts || pricedProducts.length === 0) {
    return null
  }

  const viewAllHref = collection
    ? `/collections/${collection.handle}`
    : category
    ? `/categories/${category.handle}`
    : "/store"

  const displayTitle = title ?? collection?.title ?? category?.name

  return (
    <section className="content-container py-12 small:py-16">
      <div className="flex items-end justify-between mb-6 small:mb-8">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#00d4ff] mb-1.5">
              {eyebrow}
            </p>
          )}
          <h2 className="text-xl small:text-2xl font-mono font-bold tracking-tight text-white uppercase">
            {displayTitle}
          </h2>
        </div>
        <LocalizedClientLink
          href={viewAllHref}
          className="text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors shrink-0"
        >
          VIEW ALL →
        </LocalizedClientLink>
      </div>
      <ul className="grid grid-flow-col auto-cols-[68%] xsmall:auto-cols-[42%] small:auto-cols-[calc(25%-9px)] gap-2 small:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 small:mx-0 small:px-0">
        {pricedProducts.slice(0, limit).map((product) => (
          <li key={product.id} className="snap-start">
            <ErrorBoundary
              fallback={<ProductCardErrorFallback title={product.title} />}
            >
              <ProductPreview product={product} region={region} isFeatured />
            </ErrorBoundary>
          </li>
        ))}
      </ul>
    </section>
  )
}
