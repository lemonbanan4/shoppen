export const BUNDLE_PAIRS: Record<
  string,
  {
    title: string
    thumbnail: string
    counterpartTitle: string
    counterpartHandle: string
    counterpartThumbnail: string
  }
> = {
  "aeon-beyond-the-horizon-hoodie": {
    title: "Heavyweight Hoodie",
    thumbnail:
      "https://res.cloudinary.com/y2pmxwhp/image/upload/v1791977832/aeon-hoodie.jpg",
    counterpartTitle: "Heavyweight Sweatpants",
    counterpartHandle: "aeon-beyond-the-horizon-sweatpants",
    counterpartThumbnail:
      "https://res.cloudinary.com/y2pmxwhp/image/upload/v1791999431/Gemini_Generated_Image_i3upnzi3upnzi3up.jpg",
  },
  "aeon-beyond-the-horizon-sweatpants": {
    title: "Heavyweight Sweatpants",
    thumbnail:
      "https://res.cloudinary.com/y2pmxwhp/image/upload/v1791999431/Gemini_Generated_Image_i3upnzi3upnzi3up.jpg",
    counterpartTitle: "Heavyweight Hoodie",
    counterpartHandle: "aeon-beyond-the-horizon-hoodie",
    counterpartThumbnail:
      "https://res.cloudinary.com/y2pmxwhp/image/upload/v1791977832/aeon-hoodie.jpg",
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
