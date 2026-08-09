"use client"

import { useEffect, useRef } from "react"
import posthog from "posthog-js"

type OrderTrackerProps = {
  orderId: string
  total: number
  currencyCode: string
  itemCount: number
}

/**
 * Fires `order_placed` — the one event the funnel was missing.
 *
 * Everything up to `checkout_started` was instrumented and nothing after it,
 * so PostHog could show interest but never a sale. That is not a reporting
 * gap you can reason around: with no purchase event, a query for revenue
 * returns nothing whether or not anyone bought, and the absence looks
 * identical to zero sales. Conversion rate was unmeasurable.
 *
 * Deliberately mirrors CheckoutTracker rather than capturing inside
 * placeOrder(): that runs as a server action, where posthog-js does not
 * exist, and the confirmation page is the first moment the order is known to
 * have succeeded.
 *
 * The ref guards against React's development double-invoke of effects, which
 * would otherwise double-count every order.
 */
export default function OrderTracker({
  orderId,
  total,
  currencyCode,
  itemCount,
}: OrderTrackerProps) {
  const sent = useRef<string | null>(null)

  useEffect(() => {
    if (sent.current === orderId) {
      return
    }
    sent.current = orderId
    posthog.capture("order_placed", {
      order_id: orderId,
      revenue: total,
      currency: currencyCode.toUpperCase(),
      item_count: itemCount,
    })
  }, [orderId, total, currencyCode, itemCount])

  return null
}
