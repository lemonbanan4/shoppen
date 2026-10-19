import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

export type FeaturedTile = {
  href: string
  src: string
  alt: string
  label: string
  /** Ångerköp badges its newest piece by hand; catalogue tiles carry none. */
  tag?: string
}

/**
 * Curated priority lineup order requested for the Archive lineup:
 * 1. Hoodie
 * 2. Beanie
 * 3. Zip-Up
 * 4. Sweatpants
 * 5. Matrix Tee
 * 6. Tote
 */
const CURATED_LINEUP_MATCHERS = [
  (p: HttpTypes.StoreProduct) =>
    Boolean(
      p.handle?.includes("hoodie") ||
      p.title?.toLowerCase().includes("hoodie")
    ),
  (p: HttpTypes.StoreProduct) =>
    Boolean(
      p.handle?.includes("beanie") ||
      p.title?.toLowerCase().includes("beanie")
    ),
  (p: HttpTypes.StoreProduct) =>
    Boolean(
      p.handle?.includes("zip-up") ||
      p.title?.toLowerCase().includes("zip-up")
    ),
  (p: HttpTypes.StoreProduct) =>
    Boolean(
      p.handle?.includes("sweatpants") ||
      p.title?.toLowerCase().includes("sweatpants")
    ),
  (p: HttpTypes.StoreProduct) =>
    Boolean(
      p.handle?.includes("mind-matrix") ||
      (p.title?.toLowerCase().includes("matrix") &&
        p.title?.toLowerCase().includes("tee"))
    ),
  (p: HttpTypes.StoreProduct) =>
    Boolean(
      p.handle?.includes("tote") ||
      p.title?.toLowerCase().includes("tote")
    ),
]

/**
 * The homepage tiles for the curated ARCHIVE // LINEUP.
 *
 * Reads live catalogue products scoped to the current brand sales channel,
 * orders them according to the curated lineup sequence, and preserves complete
 * product titles without stripping garment types (like "TEE").
 */
export async function featuredTiles(
  countryCode: string,
  limit: number
): Promise<FeaturedTile[]> {
  try {
    const { response } = await listProducts({
      countryCode,
      queryParams: { limit: 50, fields: "handle,title,thumbnail,*images" },
    })

    const rawProducts = response.products || []
    const sortedProducts: HttpTypes.StoreProduct[] = []
    const seenIds = new Set<string>()

    // Place products matching curated priority lineup first
    for (const matcher of CURATED_LINEUP_MATCHERS) {
      const match = rawProducts.find((p) => !seenIds.has(p.id) && matcher(p))
      if (match) {
        sortedProducts.push(match)
        seenIds.add(match.id)
      }
    }

    // Append any remaining products
    for (const p of rawProducts) {
      if (!seenIds.has(p.id)) {
        sortedProducts.push(p)
        seenIds.add(p.id)
      }
    }

    return sortedProducts
      .slice(0, limit)
      .map((p) => {
        const src = p.thumbnail || p.images?.[0]?.url
        if (!src || !p.handle || !p.title) {
          return null
        }
        return {
          href: `/products/${p.handle}`,
          src,
          alt: p.title,
          label: p.title,
        }
      })
      .filter(Boolean) as FeaturedTile[]
  } catch {
    return []
  }
}
