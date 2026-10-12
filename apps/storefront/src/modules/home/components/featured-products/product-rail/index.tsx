import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"

export default async function ProductRail({
  collection,
  region,
  eyebrow,
  title,
  countryCode,
}: {
  collection: HttpTypes.StoreCollection
  region: HttpTypes.StoreRegion
  eyebrow?: string
  // The collection's own title comes from the database in English; a Swedish
  // page passes its own heading rather than surfacing that.
  title?: string
  countryCode?: string
}) {
  const {
    response: { products: pricedProducts },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      limit: 8,
      fields: "*variants.calculated_price",
    },
  })

  if (!pricedProducts || pricedProducts.length === 0) {
    return null
  }

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
            {title ?? collection.title}
          </h2>
        </div>
        <LocalizedClientLink
          href={`/collections/${collection.handle}`}
          className="text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors shrink-0"
        >
          VIEW ALL →
        </LocalizedClientLink>
      </div>
      <ul className="grid grid-flow-col auto-cols-[68%] xsmall:auto-cols-[42%] small:auto-cols-[calc(25%-9px)] gap-2 small:gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-6 px-6 small:mx-0 small:px-0">
        {pricedProducts.map((product) => (
          <li key={product.id} className="snap-start">
            <ProductPreview product={product} region={region} isFeatured />
          </li>
        ))}
      </ul>
    </section>
  )
}
