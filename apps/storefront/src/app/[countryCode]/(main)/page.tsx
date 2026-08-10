import { Metadata } from "next"

import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import DesignsGrid from "@modules/home/components/designs-grid"
import EditorialBanner from "@modules/home/components/editorial-banner"
import ProductRail from "@modules/home/components/featured-products/product-rail"
import Hero from "@modules/home/components/hero"
import HowItWorks from "@modules/home/components/how-it-works"
import Manifesto from "@modules/home/components/manifesto"
import Marquee from "@modules/home/components/marquee"
import SiteJsonLd from "@modules/common/components/site-jsonld"
import UspBar from "@modules/home/components/usp-bar"
import { BRAND } from "@lib/brand"

export const metadata: Metadata = {
  // absolute: the root template would append "| <brand>" to a title
  // that already leads with the brand.
  title: { absolute: `${BRAND.name} — ${BRAND.tagline}` },
  description:
    "Svenskt streetwear-märke. Grafiska tröjor i ekologisk bomull, tryckta på beställning i EU. Buy now, regret later.",
}

// Collection titles live in the database in English, so each rail carries its
// own Swedish heading rather than surfacing the raw title.
const RAIL_ORDER: {
  handle: string
  eyebrow: string
  eyebrowEn: string
  title: string
  titleEn: string
}[] = [
  {
    handle: "new-arrivals",
    eyebrow: "Nyss landat",
    eyebrowEn: "Just landed",
    title: "Nyheter",
    titleEn: "New arrivals",
  },
  {
    handle: "bestsellers",
    eyebrow: "Mest älskat",
    eyebrowEn: "Most loved",
    title: "Mest sålda",
    titleEn: "Bestsellers",
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

  const isSv = countryCode === "se"

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
      <EditorialBanner countryCode={countryCode} />
      {rails[0] && (
        <ProductRail
          collection={rails[0].collection!}
          region={region}
          eyebrow={isSv ? rails[0].eyebrow : rails[0].eyebrowEn}
          title={isSv ? rails[0].title : rails[0].titleEn}
          countryCode={countryCode}
        />
      )}
      <Manifesto countryCode={countryCode} />
      <HowItWorks countryCode={countryCode} />
      {rails[1] && (
        <ProductRail
          collection={rails[1].collection!}
          region={region}
          eyebrow={isSv ? rails[1].eyebrow : rails[1].eyebrowEn}
          title={isSv ? rails[1].title : rails[1].titleEn}
          countryCode={countryCode}
        />
      )}
    </>
  )
}
