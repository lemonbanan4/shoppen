"use server"

import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export type Locale = {
  code: string
  name: string
}

/**
 * Fetches available locales from the backend.
 * Returns null if the endpoint returns 404 (locales not configured).
 *
 * `/store/locales` ships with the Medusa starter but is served by an optional
 * i18n plugin this backend does not install, so the call 404s on every render
 * of the (global) nav and the language selector it feeds never appears. That
 * is a wasted round-trip per page and, worse, a steady drip of 404s in the
 * logs that hides real ones.
 *
 * Set NEXT_PUBLIC_ENABLE_LOCALE_SWITCHER=true once a backend actually serves
 * the route; until then this returns null without touching the network.
 */
export const listLocales = async (): Promise<Locale[] | null> => {
  if (process.env.NEXT_PUBLIC_ENABLE_LOCALE_SWITCHER !== "true") {
    return null
  }

  const next = {
    ...(await getCacheOptions("locales")),
  }

  return sdk.client
    .fetch<{ locales: Locale[] }>(`/store/locales`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ locales }) => locales)
    .catch(() => null)
}
