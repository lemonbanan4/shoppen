/**
 * Meta (Facebook) Pixel client tracking helpers
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || ""

declare global {
  interface Window {
    fbq?: any
    _fbq?: any
  }
}

/**
 * Log page views across Next.js client navigations
 */
export const pageview = () => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "PageView")
  }
}

/**
 * Track custom or standard Meta Pixel events
 */
export const event = (name: string, options: Record<string, any> = {}) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", name, options)
  }
}

/**
 * Track when a visitor views product details
 */
export const trackViewContent = (data: {
  title: string
  id?: string | null
  price?: number | null
  currency?: string | null
}) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "ViewContent", {
      content_name: data.title,
      content_ids: data.id ? [data.id] : undefined,
      content_type: "product",
      value: data.price ?? undefined,
      currency: data.currency ? data.currency.toUpperCase() : "EUR",
    })
  }
}

/**
 * Track when an item is added to the cart
 */
export const trackAddToCart = (data: {
  title?: string | null
  variantId?: string | null
  price?: number | null
  currency?: string | null
  quantity?: number | null
}) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "AddToCart", {
      content_name: data.title || undefined,
      content_ids: data.variantId ? [data.variantId] : undefined,
      content_type: "product",
      value: data.price ?? undefined,
      currency: data.currency ? data.currency.toUpperCase() : "EUR",
      num_items: data.quantity || 1,
    })
  }
}

/**
 * Track when a customer enters checkout
 */
export const trackInitiateCheckout = (data: {
  cartId?: string | null
  itemCount?: number | null
  value?: number | null
  currency?: string | null
}) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "InitiateCheckout", {
      content_ids: data.cartId ? [data.cartId] : undefined,
      num_items: data.itemCount ?? undefined,
      value: data.value ?? undefined,
      currency: data.currency ? data.currency.toUpperCase() : "EUR",
    })
  }
}

/**
 * Track completed purchase orders
 */
export const trackPurchase = (data: {
  orderId: string
  value: number
  currency: string
  itemCount?: number | null
}) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "Purchase", {
      content_type: "product",
      value: data.value,
      currency: data.currency.toUpperCase(),
      order_id: data.orderId,
      num_items: data.itemCount ?? undefined,
    })
  }
}
