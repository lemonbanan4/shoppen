import { BRAND } from "@lib/brand"

/**
 * schema.org Organization data for the homepage.
 *
 * Ties the brand name, logo and social profiles together so search engines
 * treat the brand as an entity rather than an unrelated set of pages — this is
 * what backs a knowledge panel and the logo shown beside search results.
 *
 * Only claims that are verifiable from the site itself: no ratings, no
 * founding details, no contact channels the store does not actually staff.
 */
const SiteJsonLd = ({ countryCode }: { countryCode: string }) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: `${baseUrl}/${countryCode}`,
    logo: `${baseUrl}/icon.svg`,
    description:
      "Svenskt streetwear-märke. Tröjor för dig som redan vet hur det slutar — ekologisk bomull, tryckt på beställning i EU.",
    email: BRAND.email,
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default SiteJsonLd
