import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { BRAND } from "@lib/brand"
import { SHIPPING_RATES, shippingRegionFor } from "@lib/copy"

export const metadata: Metadata = {
  title: "Customer service",
  description: "Answers to common questions about orders, shipping and returns.",
}

export default async function CustomerServicePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const rates = SHIPPING_RATES[shippingRegionFor(countryCode)]

  return (
    <ContentPage
      eyebrow="Help"
      title="Customer service"
      intro="Quick answers to the questions we hear most. Can't find yours? Write to us — we answer within one business day."
    >
      <section>
        <h2>Where is my order?</h2>
        <p>
          You'll receive a confirmation email the moment your order is placed,
          and another with tracking as soon as it ships. You can also find every
          order under{" "}
          <LocalizedClientLink href="/account/orders" className="underline">
            My account → Orders
          </LocalizedClientLink>
          .
        </p>
      </section>
      <section>
        <h2>How long does shipping take?</h2>
        {/* Quoted from the same table as the shipping page, so the two cannot
            state different prices — and so no region is told about a
            free-shipping threshold its cart does not offer. */}
        <ul>
          {rates.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>Made-to-order items can add 2–4 days of production time.</li>
        </ul>
      </section>
      <section>
        <h2>What is your return policy?</h2>
        <p>
          30 days, no questions asked. Items should be unworn and in their
          original packaging. See{" "}
          <LocalizedClientLink
            href="/content/shipping-and-returns"
            className="underline"
          >
            Shipping &amp; returns
          </LocalizedClientLink>{" "}
          for the full details.
        </p>
      </section>
      <section>
        <h2>Can I change or cancel an order?</h2>
        <p>
          If it hasn't shipped yet, usually yes — contact us as soon as possible
          with your order number and we'll do our best.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Email us at <strong>{BRAND.email}</strong> and we'll get back
          to you within one business day.
        </p>
      </section>
    </ContentPage>
  )
}
