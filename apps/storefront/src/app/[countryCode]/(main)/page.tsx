import { Metadata } from "next"

import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import CategoryTiles from "@modules/home/components/category-tiles"
import EditorialBanner from "@modules/home/components/editorial-banner"
import ProductRail from "@modules/home/components/featured-products/product-rail"
import Hero from "@modules/home/components/hero"
import UspBar from "@modules/home/components/usp-bar"

export const metadata: Metadata = {
  title: "Solkast — Considered goods for everyday life",
  description:
    "A curated shop of apparel, accessories and home goods. Built to last, designed to be lived in.",
}

const RAIL_ORDER: { handle: string; eyebrow: string }[] = [
  { handle: "new-arrivals", eyebrow: "Just landed" },
  { handle: "bestsellers", eyebrow: "Most loved" },
]

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  const rails = RAIL_ORDER.map((rail) => ({
    ...rail,
    collection: collections.find((c) => c.handle === rail.handle),
  })).filter((rail) => !!rail.collection)

  return (
    <>
      <Hero />
      <UspBar />
      {rails[0] && (
        <ProductRail
          collection={rails[0].collection!}
          region={region}
          eyebrow={rails[0].eyebrow}
        />
      )}
      <CategoryTiles />
      {rails[1] && (
        <ProductRail
          collection={rails[1].collection!}
          region={region}
          eyebrow={rails[1].eyebrow}
        />
      )}
      <EditorialBanner />
    </>
  )
}
