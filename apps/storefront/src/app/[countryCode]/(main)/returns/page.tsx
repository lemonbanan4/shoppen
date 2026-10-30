import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"
import { BRAND } from "@lib/brand"
import { SHIPPING_RATES, shippingRegionFor } from "@lib/copy"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Returns & Exchanges Policy",
  description: `30-day hassle-free return policy and exchange instructions for ${BRAND.name}.`,
}

const LAST_UPDATED = "October 2026"

export default async function ReturnsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const rates = SHIPPING_RATES[shippingRegionFor(countryCode)]

  return (
    <ContentPage
      eyebrow="CUSTOMER CARE // GUARANTEE"
      title="RETURNS & EXCHANGES"
      intro={rates.intro}
    >
      <section>
        <h2>1. 30-Day Money-Back Guarantee</h2>
        <p>
          We stand firmly behind the quality, weight, and print precision of every piece we engineer. You have <strong>30 days</strong> from the delivery date to return any item for a full refund or size exchange, no questions asked.
        </p>
        <p>
          Looking for shipping rates, production timelines, or regional delivery times (US, UK, Canada, EU)? Visit our dedicated{" "}
          <LocalizedClientLink
            href="/shipping"
            className="underline font-semibold hover:text-white transition-colors"
          >
            Shipping &amp; Delivery Policy
          </LocalizedClientLink>
          .
        </p>
      </section>

      <section>
        <h2>2. 30-Day Return Policy</h2>
        <p>
          You have <strong>30 days</strong> from the recorded delivery date to return any item, no questions asked.
        </p>
        <p>
          To be eligible for a refund, garments must be in their original, unwashed, and unworn condition with tags attached.
        </p>
      </section>

      <section>
        <h2>3. How to Start a Return</h2>
        <p>
          Initiating a return is simple:
        </p>
        <ul>
          <li>Email <strong>{BRAND.email}</strong> with your order reference number and reason for return.</li>
          <li>Our customer care team will reply within 24 hours with return instructions and the nearest processing address.</li>
          <li>Pack the item securely and ship via a tracked courier service.</li>
        </ul>
        <p>
          Refunds are credited to your original payment method within 3–5 business days of the parcel being received and inspected.
        </p>
      </section>

      <section>
        <h2>4. Size Exchanges</h2>
        <p>
          Wrong size? The fastest route is to return the piece for a refund and place a new order for your desired size immediately. This guarantees that your preferred size reserves production without waiting for the return transit.
        </p>
      </section>

      <section>
        <h2>5. Misprinted, Defective, or Transit Damage</h2>
        <p>
          Craft and print precision are guaranteed. If an item arrives with a print defect, fabric flaw, or transit damage, email <strong>{BRAND.email}</strong> with clear photos of the issue. We will dispatch a brand-new replacement immediately at zero additional expense, or issue a 100% full refund.
        </p>
      </section>

      <section>
        <h2>6. Return Shipping Fees</h2>
        <p>
          Standard return shipping is the responsibility of the customer, unless the item arrived defective, misprinted, or incorrect.
        </p>
        <p>
          <em>Last updated: {LAST_UPDATED}.</em>
        </p>
      </section>
    </ContentPage>
  )
}

