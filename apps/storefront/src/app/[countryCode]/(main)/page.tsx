import { Metadata } from "next"

import { listCollections } from "@lib/data/collections"
import { getCategoryByHandle, listCategories } from "@lib/data/categories"
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
  title: { absolute: `${BRAND.name} | ${BRAND.tagline}` },
  description: BRAND.description,
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const [{ collections }, bestsellersCategory] = await Promise.all([
    listCollections({
      fields: "id, handle, title",
    }),
    getCategoryByHandle(["bestsellers"]).catch(() => null),
  ])

  const aeonCollection =
    collections?.find((c) => c.handle === "aeon-capsule") ?? collections?.[0]

  const resolvedBestsellers =
    bestsellersCategory ??
    (await listCategories()
      .then((cats) => cats?.find((c) => c.handle === "bestsellers"))
      .catch(() => null))

  return (
    <>
      <SiteJsonLd countryCode={countryCode} />
      <Hero countryCode={countryCode} />
      <Marquee />
      <UspBar countryCode={countryCode} />
      <DesignsGrid countryCode={countryCode} />
      {aeonCollection && (
        <ProductRail
          collection={aeonCollection}
          region={region}
          eyebrow="LATEST DROP"
          title="AEON CAPSULE"
          countryCode={countryCode}
          limit={8}
        />
      )}
      <Manifesto />
      {resolvedBestsellers && (
        <ProductRail
          category={resolvedBestsellers}
          region={region}
          eyebrow="ARCHIVE ESSENTIALS"
          title="BESTSELLERS"
          countryCode={countryCode}
          limit={4}
        />
      )}
      <HowItWorks />
    </>
  )
}
