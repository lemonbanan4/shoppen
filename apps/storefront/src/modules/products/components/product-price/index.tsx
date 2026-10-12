"use client"

import { clx } from "@modules/common/components/ui"
import { useCopy } from "@lib/use-copy"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const t = useCopy()
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return <div className="block w-32 h-9 bg-gray-100 animate-pulse" />
  }

  return (
    <div className="flex flex-col text-white font-mono">
      <span
        className={clx("text-2xl font-bold tracking-tight text-white", {
          "text-[#00d4ff]": selectedPrice.price_type === "sale",
        })}
      >
        {!variant && (
          <span className="text-neutral-400 font-normal mr-2 text-base">
            {t.priceFrom}
          </span>
        )}
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
          className="text-white"
        >
          {selectedPrice.calculated_price}
        </span>
      </span>
      {selectedPrice.price_type === "sale" && (
        <div className="flex items-center gap-2 mt-1 text-sm">
          <span className="text-neutral-400">Original: </span>
          <span
            className="line-through text-neutral-400"
            data-testid="original-product-price"
            data-value={selectedPrice.original_price_number}
          >
            {selectedPrice.original_price}
          </span>
          <span className="text-[#00d4ff] font-semibold">
            -{selectedPrice.percentage_diff}%
          </span>
        </div>
      )}
    </div>
  )
}
