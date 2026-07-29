"use client"

import { useEffect } from "react"
import posthog from "posthog-js"

type CheckoutTrackerProps = {
  cartId: string
  itemCount: number
}

export default function CheckoutTracker({
  cartId,
  itemCount,
}: CheckoutTrackerProps) {
  useEffect(() => {
    posthog.capture("checkout_started", {
      cart_id: cartId,
      item_count: itemCount,
    })
  }, [cartId])

  return null
}
