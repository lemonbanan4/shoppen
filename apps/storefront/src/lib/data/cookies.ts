import "server-only"
import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | Record<string, never>
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch {
    return ""
  }
}

/**
 * How long catalog responses may be served from cache.
 *
 * Cart and customer data are invalidated by cache tag the moment they are
 * mutated, but the catalog is written by the Printful sync script, which
 * talks to the backend directly and never touches the storefront's tags —
 * and the tag is per-visitor (`products-<cookie id>`) so it could not
 * invalidate everyone anyway. Combined with `cache: "force-cache"` and no
 * expiry that pinned the catalog forever: newly synced products never
 * appeared in the shop. An expiry window bounds it without giving up
 * caching on the hot path.
 */
export const CATALOG_REVALIDATE_SECONDS = 60

export const getCacheOptions = async (
  tag: string,
  revalidate?: number
): Promise<
  { tags?: string[]; revalidate?: number } | Record<string, never>
> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  return {
    ...(cacheTag ? { tags: [`${cacheTag}`] } : {}),
    ...(revalidate !== undefined ? { revalidate } : {}),
  }
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export type PendingCustomer = {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

// During the email verification flow the customer record isn't created until
// the customer verifies their email and logs in. We temporarily persist the
// extra signup fields in a cookie so they survive the customer leaving to open
// their inbox, and read them back when creating the customer at login.
export const setPendingCustomer = async (customer: PendingCustomer) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_customer", JSON.stringify(customer), {
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const getPendingCustomer = async (): Promise<PendingCustomer | null> => {
  const cookies = await nextCookies()
  const value = cookies.get("_medusa_pending_customer")?.value

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as PendingCustomer
  } catch {
    return null
  }
}

export const removePendingCustomer = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_customer", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}
