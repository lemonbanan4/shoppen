import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"

export const metadata: Metadata = {
  title: "Shipping & returns",
  description: "Shipping times, costs and our 30-day return policy.",
}

export default function ShippingReturnsPage() {
  return (
    <ContentPage
      eyebrow="Help"
      title="Shipping & returns"
      intro="The short version: fast shipping, free over €75, and 30 days to change your mind."
    >
      <section>
        <h2>Shipping</h2>
        <ul>
          <li>Standard shipping — €10, free on orders over €75. 2–5 business days within the EU.</li>
          <li>Express shipping — €19. 1–2 business days.</li>
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
          To start a return, email <strong>hej@angerkop.se</strong> with
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
