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
      <div data-testid="product-wrapper" className="bg-transparent shadow-none">
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          alt={product.title}
          size="full"
          priority={priority}
          isFeatured={isFeatured}
        />
        <div className="mt-2.5 flex flex-col gap-y-0.5">
          <div className="flex flex-col small:flex-row small:items-baseline small:justify-between small:gap-x-2">
            <p
              className="text-xs sm:text-sm font-mono text-white small:truncate tracking-tight"
              data-testid="product-title"
            >
              {product.title}
            </p>
            {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
          </div>
          {product.subtitle && (
            <p className="text-[10px] sm:text-xs font-mono text-neutral-400 truncate">
              {product.subtitle}
            </p>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
