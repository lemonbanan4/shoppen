import { listProducts } from "@lib/data/products"

export type FeaturedTile = {
  href: string
  src: string
  alt: string
  label: string
  /** Ångerköp badges its newest piece by hand; catalogue tiles carry none. */
  tag?: string
}

/**
 * The homepage tiles for a brand whose lines are not hand-curated.
 *
 * Ångerköp's hero strip and designs grid are written by hand, one gloss per
 * design, because the joke is the product and the copy carries it. Solkast has
 * no such per-piece writing, and hardcoding its tiles has already gone wrong
 * once: the hero shipped pointing at Solkast-era product ids that outlived the
 * products themselves, and again pointing at Ångerköp's, so solkast.com opened
 * showing another brand's shirts linking to handles that 404 on its own
 * channel.
 *
 * Reading the catalogue instead means the homepage cannot drift from what is
 * actually for sale. The publishable key already scopes the request to this
 * brand's sales channel, so no filtering is needed here.
 *
 * Returns [] on any failure. The homepage is the worst place to throw — a
 * missing strip is a gap, an exception is a blank site — and each caller has
 * a sensible empty state.
 */
export async function featuredTiles(
  countryCode: string,
  limit: number
): Promise<FeaturedTile[]> {
  try {
    const { response } = await listProducts({
      countryCode,
      queryParams: { limit, fields: "handle,title,thumbnail,*images" },
    })

    return response.products
      .map((p) => {
        // thumbnail is the first synced mockup; images[0] covers products
        // synced before thumbnail was being set.
        const src = p.thumbnail || p.images?.[0]?.url
        if (!src || !p.handle || !p.title) {
          return null
        }
        return {
          href: `/products/${p.handle}`,
          src,
          alt: p.title,
          label: p.title.replace(/\s+Tee$/i, ""),
        }
      })
      .filter(Boolean) as FeaturedTile[]
  } catch {
    return []
  }
}
