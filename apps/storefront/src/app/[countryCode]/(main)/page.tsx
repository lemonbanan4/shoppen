import { Metadata } from "next"

import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import DesignsGrid from "@modules/home/components/designs-grid"
import ProductRail from "@modules/home/components/featured-products/product-rail"
import Hero from "@modules/home/components/hero"
import HowItWorks from "@modules/home/components/how-it-works"
import Manifesto from "@modules/home/components/manifesto"
import Marquee from "@modules/home/components/marquee"
import SiteJsonLd from "@modules/common/components/site-jsonld"
import UspBar from "@modules/home/components/usp-bar"
import { BRAND } from "@lib/brand"

export const metadata: Metadata = {
  title: { absolute: "SOLKAST | Premium Heavyweight Streetwear" },
  description: BRAND.description,
}

const RAIL_ORDER: {
  handle: string
  eyebrow: string
  title: string
}[] = [
  {
    handle: "new-arrivals",
    eyebrow: "LATEST DROP",
    title: "NEW ARRIVALS",
  },
  {
    handle: "bestsellers",
    eyebrow: "ARCHIVE ESSENTIALS",
    title: "BESTSELLERS",
  },
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
      <SiteJsonLd countryCode={countryCode} />
      <Hero countryCode={countryCode} />
      <Marquee />
      <UspBar countryCode={countryCode} />
      <DesignsGrid countryCode={countryCode} />
      {rails[0] && (
        <ProductRail
          collection={rails[0].collection!}
          region={region}
          eyebrow={rails[0].eyebrow}
          title={rails[0].title}
          countryCode={countryCode}
        />
      )}
      <Manifesto />
      <HowItWorks />
      {rails[1] && (
        <ProductRail
          collection={rails[1].collection!}
          region={region}
          eyebrow={rails[1].eyebrow}
          title={rails[1].title}
          countryCode={countryCode}
        />
      )}
    </>
  )
}
