import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

// Tiles use our own generated product mockups, not stock photography.
const MOCKUPS =
  "https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets/main/mockups"

const TILE_CONFIG: Record<string, { image: string; tagline: string }> = {
  apparel: {
    image: `${MOCKUPS}/pf-451951375-0.jpg`,
    tagline: "Graphic tees & heavyweight hoodies",
  },
  accessories: {
    image: `${MOCKUPS}/pf-451903997-0.jpg`,
    tagline: "Caps & beanies, embroidered",
  },
}

export default async function CategoryTiles() {
  const categories = await listCategories()

  const tiles = (categories || [])
    .filter((c) => TILE_CONFIG[c.handle])
    .map((c) => ({ ...TILE_CONFIG[c.handle], name: c.name, handle: c.handle }))

  if (tiles.length === 0) {
    return null
  }

  return (
    <section className="content-container py-12 small:py-16">
      <div className="flex items-end justify-between mb-6 small:mb-8">
        <div>
          <p className="text-[11px] tracking-[0.2em] uppercase text-brand mb-1.5">
            Departments
          </p>
          <h2 className="text-xl small:text-2xl font-medium text-neutral-950">
            Shop by category
          </h2>
        </div>
      </div>
      <div
        className={`grid grid-cols-1 gap-4 small:gap-6 ${
          tiles.length === 2 ? "xsmall:grid-cols-2" : "xsmall:grid-cols-3"
        }`}
      >
        {tiles.map((tile) => (
          <LocalizedClientLink
            key={tile.handle}
            href={`/categories/${tile.handle}`}
            className="group relative aspect-[4/5] xsmall:aspect-[3/4] rounded-xl overflow-hidden"
          >
            <Image
              src={tile.image}
              alt={tile.name}
              fill
              sizes="(max-width: 512px) 100vw, 33vw"
              className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-5 text-white">
              <p className="text-lg font-medium">{tile.name}</p>
              <p className="text-xs text-white/80 mt-0.5">{tile.tagline}</p>
            </div>
          </LocalizedClientLink>
        ))}
      </div>
    </section>
  )
}
