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
        <ul>
          {rates.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>Production requires 2–4 business days before dispatch.</li>
        </ul>
        <p className="mt-2 text-xs">
          View our full transit breakdown for the US, UK, Canada, and EU on the{" "}
          <LocalizedClientLink href="/shipping" className="underline font-medium hover:text-white transition-colors">
            Shipping &amp; Delivery Policy
          </LocalizedClientLink>
          .
        </p>
      </section>
      <section>
        <h2>What is your return policy?</h2>
        <p>
          30 days, no questions asked. Items must be in original unworn condition with tags attached. See our full{" "}
          <LocalizedClientLink
            href="/returns"
            className="underline font-medium hover:text-white transition-colors"
          >
            Returns &amp; Exchanges Policy
          </LocalizedClientLink>{" "}
          for instructions.
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
        <h2>Contact &amp; Business Inquiries</h2>
        <p>
          Email us at <strong>{BRAND.email}</strong>. Our customer care team responds to all inquiries within one business day (Monday to Friday, 9:00 AM – 5:00 PM EST).
        </p>
        <p className="mt-2 text-xs text-neutral-400 font-mono">
          {BRAND.name} is operated by <strong>CogCore LLC</strong>, 30 N Gould St Ste R, Sheridan, WY 82801, United States.
        </p>
      </section>
    </ContentPage>
  )
}
