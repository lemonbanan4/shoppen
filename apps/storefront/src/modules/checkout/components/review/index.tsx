"use client"

import { Heading, Text, clx } from "@modules/common/components/ui"

import PaymentButton from "../payment-button"
import { useSearchParams } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { useCopy } from "@lib/use-copy"
import { BRAND } from "@lib/brand"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  LockIcon,
  ShieldCheckIcon,
  PaymentMethodBadges,
} from "@modules/common/components/payment-badges"

const Review = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const t = useCopy()
  const searchParams = useSearchParams()

  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards && ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])?.length > 0 && cart?.total === 0
  )

  const previousStepsCompleted =
    cart.shipping_address &&
    (cart.shipping_methods?.length ?? 0) > 0 &&
    (cart.payment_collection || paidByGiftcard)

  return (
    <div className="bg-white text-neutral-950 brand-card px-6 py-6 sm:px-8">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none": !isOpen,
            }
          )}
        >
          {t.review}
        </Heading>
      </div>
      {isOpen && previousStepsCompleted && (
        <>
          <div className="flex items-start gap-x-1 w-full mb-6">
            <div className="w-full text-xs text-neutral-500 leading-relaxed font-sans">
              By clicking Place Order, you confirm that you have read and agree to {BRAND.name}&apos;s{" "}
              <LocalizedClientLink
                href="/terms-of-service"
                className="underline hover:text-neutral-900 transition-colors"
                target="_blank"
              >
                Terms of Service
              </LocalizedClientLink>
              ,{" "}
              <LocalizedClientLink
                href="/returns"
                className="underline hover:text-neutral-900 transition-colors"
                target="_blank"
              >
                Return Policy
              </LocalizedClientLink>
              , and{" "}
              <LocalizedClientLink
                href="/privacy-policy"
                className="underline hover:text-neutral-900 transition-colors"
                target="_blank"
              >
                Privacy Policy
              </LocalizedClientLink>
              . All orders are covered by our 30-day return guarantee.
            </div>
          </div>

          <PaymentButton cart={cart} data-testid="submit-order-button" />

          {/* Checkout Trust & Credibility Footprint */}
          <div className="mt-6 pt-5 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <LockIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-mono text-[11px] text-neutral-600">
                256-Bit SSL · Verified Stripe Checkout
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <PaymentMethodBadges size="small" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Review
