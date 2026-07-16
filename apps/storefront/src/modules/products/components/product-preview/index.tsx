import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
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
          size="full"
          isFeatured={isFeatured}
        />
        <div className="mt-3 flex flex-col gap-y-0.5">
          <div className="flex items-baseline justify-between gap-x-4">
            <p
              className="text-sm font-medium text-neutral-900 truncate"
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
