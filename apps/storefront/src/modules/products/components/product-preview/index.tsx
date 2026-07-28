import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  priority,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  priority?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div data-testid="product-wrapper">
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          alt={product.title}
          size="full"
          priority={priority}
          isFeatured={isFeatured}
        />
        <div className="mt-3 flex flex-col gap-y-0.5">
          {/* Stacked on phones: sharing one row with the price left about
              half a two-column card for the name, cutting "Coffee Run
              Hoodie" down to "Coffee Run ...". Side by side from the
              small breakpoint, where there is room for both. */}
          <div className="flex flex-col small:flex-row small:items-baseline small:justify-between small:gap-x-4">
            <p
              className="text-sm font-medium text-neutral-900 small:truncate"
              data-testid="product-title"
            >
              {product.title}
            </p>
            {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
          </div>
          {product.subtitle && (
            <p className="text-xs text-neutral-500 truncate">
              {product.subtitle}
            </p>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
