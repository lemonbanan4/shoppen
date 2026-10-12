import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"
import { BRAND } from "@lib/brand"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms and conditions for shopping with ${BRAND.name}, operated by CogCore LLC.`,
}

const LAST_UPDATED = "October 2026"

export default function TermsOfServicePage() {
  return (
    <ContentPage
      eyebrow="LEGAL // POLICIES"
      title="TERMS OF SERVICE"
      intro={`The plain-language version of what you agree to when ordering from ${BRAND.name} — written for clarity, protecting your statutory rights.`}
    >
      <section>
        <h2>1. Who You Are Buying From</h2>
        <p>
          {BRAND.name} is a trading name of <strong>CogCore LLC</strong>, 30 N Gould
          St Ste R, Sheridan, WY 82801, United States. Inquiries and customer
          support can be directed to <strong>{BRAND.email}</strong>.
        </p>
        <p>
          These terms apply to every order placed through {BRAND.domain}. Nothing
          contained herein reduces or limits your statutory consumer rights under the
          applicable laws of your country of residence.
        </p>
      </section>

      <section>
        <h2>2. Orders, Pricing & Currency</h2>
        <p>
          Prices are displayed in the regional currency corresponding to your selected
          delivery destination and include value-added taxes where stated at checkout.
          Shipping fees are calculated and itemized before payment. A binding contract
          is formed when we dispatch your order confirmation email — not upon clicking pay.
        </p>
        <p>
          In the event of a genuine technical pricing or availability error, we reserve
          the right to cancel the affected items and issue an immediate full refund prior
          to shipment.
        </p>
      </section>

      <section>
        <h2>3. On-Demand Production & Fulfillment</h2>
        <p>
          All {BRAND.name} garments are printed on demand following order confirmation.
          This eliminates excess inventory, deadstock, and unnecessary textile waste.
          These pieces are standard silhouettes from our curated catalogue, so your 30-day
          right of return applies in full.
        </p>
        <p>
          Production and handling typically requires 2–4 business days prior to dispatch.
          Orders ship from our nearest certified fulfillment facility (EU, US, or regional
          hubs). You will receive automated end-to-end tracking the moment your parcel departs.
        </p>
      </section>

      <section>
        <h2>4. 30-Day Return Policy</h2>
        <p>
          You have <strong>30 days</strong> from the delivery date to return an unworn,
          unwashed item in its original condition with tags attached — exceeding the standard
          14-day statutory withdrawal period applicable to EU consumers.
        </p>
        <p>
          To initiate a return or exchange, email <strong>{BRAND.email}</strong> with your
          order number. Refunds are processed to your original payment method once the return
          is inspected. Return postage is covered by the customer unless the garment is faulty
          or an error occurred in fulfillment.
        </p>
      </section>

      <section>
        <h2>5. Defective, Misprinted or Damaged Garments</h2>
        <p>
          Quality is central to our standard. If an item arrives damaged in transit,
          misprinted, or incorrect in size/variant, notify us promptly at{" "}
          <strong>{BRAND.email}</strong> with photos of the issue. We will dispatch a brand-new
          replacement immediately at no charge, or issue a 100% full refund including shipping.
        </p>
      </section>

      <section>
        <h2>6. Accounts & Security</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials.
          We reserve the right to suspend or terminate accounts used fraudulently or in
          violation of these terms.
        </p>
      </section>

      <section>
        <h2>7. Intellectual Property</h2>
        <p>
          All graphic artworks, typography, silhouettes, photographic media, visual identity,
          and written copy on this storefront belong to CogCore LLC. Purchasing a garment grants
          ownership of the physical piece, not a commercial license to duplicate, reproduce,
          or distribute the artwork.
        </p>
      </section>

      <section>
        <h2>8. Limitation of Liability</h2>
        <p>
          Nothing in these terms excludes liability that cannot lawfully be excluded under
          governing consumer law. Subject to applicable regulations, our cumulative liability
          for any verified claim in connection with an order is limited to the total amount paid
          for that order.
        </p>
      </section>

      <section>
        <h2>9. Disputes & Online Resolution</h2>
        <p>
          Please reach out to us first at <strong>{BRAND.email}</strong> — our support team resolves
          the vast majority of issues quickly and amicably. For consumers residing within the
          European Union, you may also utilize the European Commission&apos;s Online Dispute
          Resolution (ODR) platform at{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white underline underline-offset-4 hover:text-neutral-300"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
        <p>
          As a consumer, you retain the full protection of the mandatory legal provisions of
          your country of residence.
        </p>
      </section>

      <section>
        <h2>10. Contact & Updates</h2>
        <p>
          For any inquiries concerning these terms, contact{" "}
          <strong>{BRAND.email}</strong>.
        </p>
        <p>
          <em>Last updated: {LAST_UPDATED}.</em>
        </p>
      </section>
    </ContentPage>
  )
}

