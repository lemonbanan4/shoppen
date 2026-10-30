"use client"

import { Heading } from "@modules/common/components/ui"

import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"
import { useCopy } from "@lib/use-copy"

const CheckoutSummary = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const t = useCopy()
  return (
    <div className="small:sticky small:top-0 flex flex-col-reverse small:flex-col gap-y-8 py-8 small:py-0">
      <div className="w-full bg-white text-neutral-950 flex flex-col brand-card px-4 py-6 sm:px-8">
        <Divider className="my-6 small:hidden" />
        <Heading
          level="h2"
          className="flex flex-row text-3xl-regular items-baseline"
        >
          {t.inYourCart}
        </Heading>
        <Divider className="my-6" />
        <CartTotals totals={cart} />
        <ItemsPreviewTemplate cart={cart} />
        <div className="my-6">
          <DiscountCode cart={cart} />
        </div>

        {/* Checkout Trust Guarantee Signals */}
        <div className="pt-5 border-t border-neutral-100 flex flex-col gap-y-3 text-xs text-neutral-600 font-sans">
          <div className="flex items-start gap-2.5">
            <span className="text-emerald-600 font-bold text-sm leading-none mt-0.5">✓</span>
            <div>
              <span className="font-semibold text-neutral-900 block text-[11px] uppercase tracking-wider font-mono">
                Tracked Global Delivery
              </span>
              <p className="text-[11px] text-neutral-500 leading-tight mt-0.5">
                US 3–7d · UK 3–7d · CA 5–10d · EU 2–5d with end-to-end tracking
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-emerald-600 font-bold text-sm leading-none mt-0.5">✓</span>
            <div>
              <span className="font-semibold text-neutral-900 block text-[11px] uppercase tracking-wider font-mono">
                30-Day Return Guarantee
              </span>
              <p className="text-[11px] text-neutral-500 leading-tight mt-0.5">
                Hassle-free refunds or size exchanges on all unworn items
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-emerald-600 font-bold text-sm leading-none mt-0.5">✓</span>
            <div>
              <span className="font-semibold text-neutral-900 block text-[11px] uppercase tracking-wider font-mono">
                Safe &amp; Encrypted Checkout
              </span>
              <p className="text-[11px] text-neutral-500 leading-tight mt-0.5">
                Processed securely via Stripe with 256-bit SSL encryption
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutSummary
