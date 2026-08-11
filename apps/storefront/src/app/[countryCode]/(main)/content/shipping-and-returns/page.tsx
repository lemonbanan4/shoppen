import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"
import { BRAND } from "@lib/brand"
import { SHIPPING_RATES, shippingRegionFor } from "@lib/copy"

export const metadata: Metadata = {
  title: "Shipping & returns",
  description: "Shipping times, costs and our 30-day return policy.",
}

export default async function ShippingReturnsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  // The page previously stated the EU rate card as universal fact, so a US or
  // Rest-of-World visitor was quoted euro prices and a free-shipping threshold
  // their region does not have. Rates now follow the route, matching the
  // shipping options their cart will actually offer.
  const { countryCode } = await props.params
  const rates = SHIPPING_RATES[shippingRegionFor(countryCode)]

  return (
    <ContentPage eyebrow="Help" title="Shipping & returns" intro={rates.intro}>
      <section>
        <h2>Shipping</h2>
        <ul>
          {rates.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>Made-to-order items add 2–4 days of production before dispatch.</li>
          <li>You'll get tracking by email the moment your parcel ships.</li>
        </ul>
      </section>
      <section>
        <h2>Returns</h2>
        <p>
          You have 30 days from delivery to return any item, no questions asked.
          Items should be unworn, unwashed and in their original packaging.
          Made-to-order items can be returned if faulty or misprinted — send us a
          photo and we'll replace or refund immediately.
        </p>
        <p>
          To start a return, email <strong>{BRAND.email}</strong> with
          your order number. Refunds are issued to the original payment method
          within 5 business days of us receiving the return.
        </p>
      </section>
      <section>
        <h2>Exchanges</h2>
        <p>
          Wrong size? The fastest route is to return for a refund and place a
          new order — that way the size you want doesn't sell out while your
          return travels.
        </p>
      </section>
    </ContentPage>
  )
}
