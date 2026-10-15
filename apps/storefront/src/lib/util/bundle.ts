export const BUNDLE_PAIRS: Record<
  string,
  {
    title: string
    counterpartTitle: string
    counterpartHandle: string
  }
> = {
  "aeon-beyond-the-horizon-hoodie": {
    title: "Heavyweight Hoodie",
    counterpartTitle: "Heavyweight Sweatpants",
    counterpartHandle: "aeon-beyond-the-horizon-sweatpants",
  },
  "aeon-beyond-the-horizon-sweatpants": {
    title: "Heavyweight Sweatpants",
    counterpartTitle: "Heavyweight Hoodie",
    counterpartHandle: "aeon-beyond-the-horizon-hoodie",
  },
}

export function getBundlePair(handle?: string | null) {
  if (!handle) return null
  return BUNDLE_PAIRS[handle] || null
}

export function isBundleEligible(handle?: string | null) {
  return Boolean(getBundlePair(handle))
}

export function getBundleDiscountAmount(currencyCode?: string | null) {
  const currency = currencyCode?.toLowerCase() || "eur"
  if (currency === "sek") return "100 kr"
  if (currency === "usd") return "$10"
  return "10 €"
}
