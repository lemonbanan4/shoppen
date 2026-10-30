"use client"

import { Button, Heading } from "@modules/common/components/ui"

import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { useCopy } from "@lib/use-copy"
import { PaymentMethodBadges } from "@modules/common/components/payment-badges"

type SummaryProps = {
  cart: HttpTypes.StoreCart
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart }: SummaryProps) => {
  const t = useCopy()
  const step = getCheckoutStep(cart)

  return (
    <div className="flex flex-col gap-y-4">
      <Heading level="h2" className="text-[2rem] leading-[2.75rem]">
        {t.summary}
      </Heading>
      <DiscountCode cart={cart} />
      <Divider />
      <CartTotals totals={cart} />
      <LocalizedClientLink
        href={"/checkout?step=" + step}
        data-testid="checkout-button"
        className="w-full block"
      >
        <Button size="large" className="w-full h-12 text-base font-medium">{t.goToCheckout}</Button>
      </LocalizedClientLink>

      <div className="pt-3 border-t border-neutral-100 flex flex-col gap-y-2 text-xs text-neutral-500 font-sans">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">Guaranteed Safe Checkout</span>
          <PaymentMethodBadges size="small" />
        </div>
        <div className="flex items-center gap-x-3 text-[11px] text-neutral-500 font-mono">
          <span>✓ Tracked Delivery</span>
          <span>✓ 30-Day Returns</span>
          <span>✓ 256-Bit SSL</span>
        </div>
      </div>
    </div>
  )
}

export default Summary
