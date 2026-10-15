import React from "react"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { getBundlePair, getBundleDiscountAmount } from "@lib/util/bundle"

type BundleCalloutProps = {
  product: HttpTypes.StoreProduct
  region?: HttpTypes.StoreRegion
}

export default function BundleCallout({ product, region }: BundleCalloutProps) {
  if (!product?.handle) return null

  const pair = getBundlePair(product.handle)
  if (!pair) return null

  const discountAmount = getBundleDiscountAmount(region?.currency_code)

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#00d4ff]/30 bg-[#00d4ff]/5 p-3.5 backdrop-blur-sm transition-all hover:border-[#00d4ff]/50">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4ff] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d4ff]" />
        </span>
        <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#00d4ff]">
          Bundle Set Offer
        </span>
      </div>

      <p className="text-xs font-mono text-neutral-300 leading-relaxed">
        Pair with the{" "}
        <LocalizedClientLink
          href={`/products/${pair.counterpartHandle}`}
          className="font-bold text-white underline underline-offset-2 decoration-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors"
        >
          {pair.counterpartTitle}
        </LocalizedClientLink>{" "}
        to save{" "}
        <span className="font-bold text-[#00d4ff]">{discountAmount}</span>{" "}
        automatically at checkout.
      </p>
    </div>
  )
}
