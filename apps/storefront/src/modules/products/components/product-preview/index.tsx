import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import { isBundleEligible, getBundleDiscountAmount } from "@lib/util/bundle"

export default async function ProductPreview({
  product,
  isFeatured,
  priority,
  region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  priority?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })

  const isBundle = isBundleEligible(product.handle)
  const bundleDiscount = isBundle
    ? getBundleDiscountAmount(region?.currency_code)
    : null

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div data-testid="product-wrapper" className="bg-transparent shadow-none">
        <div className="relative">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            alt={product.title}
            size="full"
            priority={priority}
            isFeatured={isFeatured}
          />
          {isBundle && (
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/85 backdrop-blur-md border border-[#00d4ff]/40 text-[#00d4ff] font-mono text-[9px] uppercase tracking-wider font-semibold shadow-[0_0_12px_rgba(0,212,255,0.2)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
                Bundle Save {bundleDiscount}
              </span>
            </div>
          )}
        </div>
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
