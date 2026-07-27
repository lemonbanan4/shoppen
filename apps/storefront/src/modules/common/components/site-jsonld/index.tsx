/**
 * schema.org Organization data for the homepage.
 *
 * Ties the brand name, logo and social profiles together so search engines
 * treat Solkast as an entity rather than an unrelated set of pages — this is
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
    name: "Solkast",
    url: `${baseUrl}/${countryCode}`,
    logo: `${baseUrl}/icon.svg`,
    description:
      "Independent streetwear label. Original graphic capsules, printed to order in the EU and US.",
    email: "hello@solkast.com",
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
