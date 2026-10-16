import React from "react"
import Image from "next/image"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { BUNDLE_PAIRS, getBundleDiscountAmount } from "@lib/util/bundle"

type BundleUpsellProps = {
  cart?: HttpTypes.StoreCart | null
  className?: string
  compact?: boolean
}

export default function BundleUpsell({
  cart,
  className = "",
  compact = false,
}: BundleUpsellProps) {
  if (!cart?.items || cart.items.length === 0) return null

  const hasHoodie = cart.items.some(
    (i) =>
      i.product_handle === "aeon-beyond-the-horizon-hoodie" ||
      i.title?.toLowerCase().includes("beyond the horizon hoodie") ||
      i.title?.toLowerCase().includes("heavyweight hoodie")
  )

  const hasSweatpants = cart.items.some(
    (i) =>
      i.product_handle === "aeon-beyond-the-horizon-sweatpants" ||
      i.title?.toLowerCase().includes("beyond the horizon sweatpants") ||
      i.title?.toLowerCase().includes("heavyweight sweatpants")
  )

  if (!hasHoodie && !hasSweatpants) return null

  const discountAmount = getBundleDiscountAmount(cart.currency_code)

  // Both items in cart -> Unlocked state
  if (hasHoodie && hasSweatpants) {
    return (
      <div
        className={`flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-xs ${className}`}
      >
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <span className="leading-snug">
          <strong className="text-white uppercase tracking-wider mr-1">
            Bundle Unlocked:
          </strong>
          {discountAmount} discount applied to your Beyond the Horizon set!
        </span>
      </div>
    )
  }

  const counterpartKey =
    hasHoodie && !hasSweatpants
      ? "aeon-beyond-the-horizon-hoodie"
      : "aeon-beyond-the-horizon-sweatpants"
  const pair = BUNDLE_PAIRS[counterpartKey]
  if (!pair) return null

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-white font-mono text-xs ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <LocalizedClientLink
          href={`/products/${pair.counterpartHandle}`}
          className="relative w-11 h-14 rounded-lg overflow-hidden border border-[#00d4ff]/30 shrink-0 bg-neutral-900 group"
        >
          <Image
            src={pair.counterpartThumbnail}
            alt={pair.counterpartTitle}
            fill
            sizes="44px"
            className="object-cover group-hover:scale-105 transition-transform"
          />
        </LocalizedClientLink>

        <div className="leading-snug">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4ff] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d4ff]" />
            </span>
            <span className="font-bold text-[#00d4ff] uppercase tracking-wider text-[11px]">
              Complete the set
            </span>
          </div>
          <p className="text-neutral-200 text-xs">
            Add {pair.counterpartTitle} to save{" "}
            <strong className="text-white font-bold">{discountAmount}</strong> on
            your bundle.
          </p>
        </div>
      </div>

      <LocalizedClientLink
        href={`/products/${pair.counterpartHandle}`}
        className="inline-flex items-center justify-center whitespace-nowrap bg-white text-black hover:bg-neutral-200 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider text-[11px] transition-all shrink-0 self-start sm:self-auto"
      >
        View Piece →
      </LocalizedClientLink>
    </div>
  )
}
