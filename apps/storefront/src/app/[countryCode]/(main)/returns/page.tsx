import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"
import { BRAND } from "@lib/brand"
import { SHIPPING_RATES, shippingRegionFor } from "@lib/copy"

export const metadata: Metadata = {
  title: "Returns & Shipping",
  description: `30-day return policy and shipping rates for ${BRAND.name}.`,
}

const LAST_UPDATED = "October 2026"

export default async function ReturnsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const rates = SHIPPING_RATES[shippingRegionFor(countryCode)]

  return (
    <ContentPage
      eyebrow="CUSTOMER CARE // LOGISTICS"
      title="SHIPPING & RETURNS"
      intro={rates.intro}
    >
      <section>
        <h2>1. Shipping Rates & Delivery Times</h2>
        <ul>
          {rates.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>All garments are printed on demand to eliminate waste. Production requires 2–4 business days before dispatch.</li>
          <li>You will receive automated end-to-end tracking by email the moment your parcel ships.</li>
        </ul>
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

