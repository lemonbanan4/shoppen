import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Shoppen collects, uses and protects your data.",
}

export default function PrivacyPolicyPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Privacy policy"
      intro="We collect the minimum we need to run the shop, and we never sell your data."
    >
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Order details: name, shipping address, email, phone (optional), and what you bought.</li>
          <li>Account details, if you create one: the same, plus saved addresses and order history.</li>
          <li>Basic technical data needed to serve the site securely (IP address, browser type).</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To fulfil and deliver your orders, including sharing your shipping address with our fulfilment and delivery partners.</li>
          <li>To send transactional email (order confirmations, shipping updates, account messages).</li>
          <li>To handle returns, refunds and support requests.</li>
        </ul>
        <p>
          We do not sell or rent your personal data, and we don't send marketing
          email unless you explicitly opt in.
        </p>
      </section>
      <section>
        <h2>Payments</h2>
        <p>
          Card and wallet payments are processed by our payment provider; your
          full card details never touch our servers.
        </p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>
          Under the GDPR you can request a copy of your data, correction, or
          deletion at any time. Email <strong>hello@shoppen.example</strong> and
          we'll respond within 30 days.
        </p>
      </section>
    </ContentPage>
  )
}
