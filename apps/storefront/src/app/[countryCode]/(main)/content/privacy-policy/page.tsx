import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Ångerköp, operated by CogCore LLC, collects, uses and protects your personal data under the GDPR.",
}

// Reviewed 30 July 2026. Named processors are the ones actually wired up —
// Stripe, Printful, Resend, PostHog, Railway, Cloudflare. If an integration
// is added or removed, this list has to change with it: naming recipients is
// a GDPR requirement, not decoration.
const LAST_UPDATED = "30 July 2026"

export default function PrivacyPolicyPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Privacy policy"
      intro="We collect the minimum we need to run the shop, we name everyone we share it with, and we never sell your data."
    >
      <section>
        <h2>Who we are</h2>
        <p>
          Ångerköp is operated by <strong>CogCore LLC</strong>, 30 N Gould St
          Ste R, Sheridan, WY 82801, United States. CogCore LLC is the data
          controller for personal data collected through angerkop.se.
        </p>
        <p>
          For any privacy question, or to exercise the rights described below,
          email <strong>hej@angerkop.se</strong>.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Order data</strong> — name, shipping address, email, phone
            (optional), order contents and order history.
          </li>
          <li>
            <strong>Account data</strong>, if you create an account — the above
            plus saved addresses and a hashed password. We never store your
            password in readable form.
          </li>
          <li>
            <strong>Payment data</strong> — handled by Stripe. We receive
            confirmation of payment and the last four digits and card brand. We
            never see or store your full card number.
          </li>
          <li>
            <strong>Technical data</strong> — IP address, browser and device
            type, pages visited, and referring site.
          </li>
        </ul>
      </section>

      <section>
        <h2>Why we use it, and our legal basis</h2>
        <ul>
          <li>
            <strong>To fulfil your order</strong> — including sending your
            address to our print and delivery partners.{" "}
            <em>Legal basis: performance of a contract.</em>
          </li>
          <li>
            <strong>To send transactional email</strong> — order confirmations,
            shipping updates, account messages.{" "}
            <em>Legal basis: performance of a contract.</em>
          </li>
          <li>
            <strong>To handle returns, refunds and support.</strong>{" "}
            <em>Legal basis: contract and legal obligation.</em>
          </li>
          <li>
            <strong>To keep the shop working and secure</strong>, and to
            understand in aggregate how it is used.{" "}
            <em>Legal basis: legitimate interests.</em>
          </li>
          <li>
            <strong>To send marketing email</strong> — only if you explicitly
            sign up. <em>Legal basis: consent</em>, withdrawable at any time via
            the unsubscribe link in any such email.
          </li>
        </ul>
        <p>We do not sell or rent your personal data, and we never have.</p>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>
          We use the following processors, and only for the purposes above:
        </p>
        <ul>
          <li>
            <strong>Stripe</strong> — payment processing.
          </li>
          <li>
            <strong>Printful</strong> — printing and shipping your order.
            Receives your name and delivery address.
          </li>
          <li>
            <strong>Resend</strong> — sending transactional email.
          </li>
          <li>
            <strong>PostHog</strong> (EU hosting) — product analytics.
          </li>
          <li>
            <strong>Railway</strong> and <strong>Cloudflare</strong> — hosting
            and content delivery.
          </li>
        </ul>
        <p>
          We also disclose data where we are legally required to, for example in
          response to a valid legal request.
        </p>
      </section>

      <section>
        <h2>International transfers</h2>
        <p>
          CogCore LLC is established in the United States, and some of our
          processors are too. Where personal data of individuals in the EU or
          UK is transferred outside those areas, we rely on the European
          Commission&apos;s Standard Contractual Clauses, or an equivalent
          safeguard, as the transfer mechanism.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <ul>
          <li>
            <strong>Order records</strong> — kept for as long as needed to
            support the order and to meet accounting and tax record-keeping
            obligations.
          </li>
          <li>
            <strong>Account data</strong> — kept until you delete your account.
          </li>
          <li>
            <strong>Analytics data</strong> — retained in aggregate.
          </li>
          <li>
            <strong>Marketing consent</strong> — until you unsubscribe.
          </li>
        </ul>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          If you are in the EU, EEA or UK, you have the right to access your
          data, correct it, delete it, restrict or object to its processing,
          withdraw consent, and receive your data in a portable format. Email{" "}
          <strong>hej@angerkop.se</strong> and we will respond within one month.
        </p>
        <p>
          You also have the right to complain to your national data protection
          authority. In Sweden this is{" "}
          <strong>Integritetsskyddsmyndigheten (IMY)</strong>, imy.se.
        </p>
      </section>

      <section>
        <h2>Cookies and analytics</h2>
        <p>
          We use only what the shop needs to function — a session cookie to keep
          your cart and login working — plus privacy-friendly product analytics
          via PostHog, hosted in the EU, to understand which pages and products
          people actually use. We do not run advertising or cross-site tracking
          cookies.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If we change this policy we will update the date below, and for
          significant changes we will say so on the site.
        </p>
        <p>
          <em>Last updated: {LAST_UPDATED}.</em>
        </p>
      </section>
    </ContentPage>
  )
}
