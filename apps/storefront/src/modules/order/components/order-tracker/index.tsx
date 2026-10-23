"use client"

import { useEffect, useRef } from "react"
import posthog from "posthog-js"
import { trackPurchase } from "@lib/meta-pixel"

type OrderTrackerProps = {
  orderId: string
  total: number
  currencyCode: string
  itemCount: number
}

/**
 * Fires `order_placed` and Meta Pixel `Purchase` — tracking the conversion.
 *
 * Everything up to `checkout_started` was instrumented and nothing after it,
 * so PostHog and Meta Pixel could show interest but never a sale.
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

    trackPurchase({
      orderId,
      value: total,
      currency: currencyCode,
      itemCount,
    })
  }, [orderId, total, currencyCode, itemCount])

  return null
}
