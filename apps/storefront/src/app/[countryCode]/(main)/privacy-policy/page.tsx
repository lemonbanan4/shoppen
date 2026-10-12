import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"
import { BRAND } from "@lib/brand"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${BRAND.name}, operated by CogCore LLC, collects, uses, and protects your personal data under the GDPR.`,
}

const LAST_UPDATED = "October 2026"

export default function PrivacyPolicyPage() {
  return (
    <ContentPage
      eyebrow="LEGAL // PRIVACY"
      title="PRIVACY POLICY"
      intro="We collect the minimum data necessary to operate our shop, we explicitly name every processor we partner with, and we never sell your personal information."
    >
      <section>
        <h2>1. Who We Are</h2>
        <p>
          {BRAND.name} is operated by <strong>CogCore LLC</strong>, 30 N Gould St Ste R,
          Sheridan, WY 82801, United States. CogCore LLC is the data controller for personal
          data processed through {BRAND.domain}.
        </p>
        <p>
          For any privacy questions, data requests, or to exercise your rights under GDPR,
          contact our data protection contact at <strong>{BRAND.email}</strong>.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <ul>
          <li>
            <strong>Order Information:</strong> Full name, delivery address, email, phone number (optional),
            order items, variant sizing, and transaction history.
          </li>
          <li>
            <strong>Account Credentials:</strong> If you register an account — your email and securely hashed
            passwords. We never store or have access to plaintext passwords.
          </li>
          <li>
            <strong>Payment Processing:</strong> Transactions are securely handled by <strong>Stripe</strong>.
            We only receive payment authorization confirmation, card brand, and the last four digits of your card.
            We never access, transmit, or store full credit card numbers.
          </li>
          <li>
            <strong>Technical & Telemetry Data:</strong> IP address, device type, browser user-agent, pages viewed,
            and operational diagnostics to monitor storefront reliability and prevent abuse.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Purposes & Legal Bases for Processing</h2>
        <ul>
          <li>
            <strong>Fulfilling & Shipping Orders:</strong> Transmitting shipping destinations to our print and carrier
            partners. <em>Legal basis: Performance of a contract.</em>
          </li>
          <li>
            <strong>Transactional Communications:</strong> Dispatching automated receipts, dispatch notifications,
            and tracking credentials. <em>Legal basis: Performance of a contract.</em>
          </li>
          <li>
            <strong>Returns & Customer Support:</strong> Handling size exchanges, refunds, and inquiries.{" "}
            <em>Legal basis: Contractual obligation and consumer law compliance.</em>
          </li>
          <li>
            <strong>Storefront Security & Performance:</strong> Ensuring site stability, error logging, and fraud prevention.{" "}
            <em>Legal basis: Legitimate interests.</em>
          </li>
          <li>
            <strong>Direct Communications:</strong> Newsletter updates only when you affirmatively opt in.{" "}
            <em>Legal basis: Consent (revocable anytime via one-click unsubscribe links).</em>
          </li>
        </ul>
        <p>We do not sell, rent, or trade your personal data to data brokers or advertising networks.</p>
      </section>

      <section>
        <h2>4. Infrastructure & Processors</h2>
        <p>We work exclusively with vetted infrastructure providers bound by strict confidentiality and data protection agreements:</p>
        <ul>
          <li><strong>Stripe:</strong> Encrypted payment handling and PCI-DSS compliance.</li>
          <li><strong>Printful:</strong> On-demand garment printing and order fulfillment.</li>
          <li><strong>Resend:</strong> Secure delivery of transactional order emails.</li>
          <li><strong>PostHog (EU Cloud):</strong> Privacy-friendly product telemetry hosted strictly within the European Union.</li>
          <li><strong>Cloudflare & Railway:</strong> Edge CDN, DDoS mitigation, and application hosting.</li>
          <li><strong>Cloudinary:</strong> High-performance media and image delivery.</li>
        </ul>
      </section>

      <section>
        <h2>5. International Data Transfers</h2>
        <p>
          CogCore LLC is established in the United States. Where personal data of EU, EEA, or UK individuals
          is transferred internationally, we rely on the European Commission&apos;s Standard Contractual Clauses (SCCs)
          or equivalent adequacy safeguards to guarantee an equivalent level of protection.
        </p>
      </section>

      <section>
        <h2>6. Data Retention</h2>
        <ul>
          <li><strong>Order & Invoicing Records:</strong> Retained for statutory periods mandated by commercial, tax, and accounting law.</li>
          <li><strong>Account Information:</strong> Maintained until you request deletion of your account.</li>
          <li><strong>Product Analytics:</strong> Retained in aggregated, de-identified format.</li>
          <li><strong>Marketing Consent:</strong> Retained until you opt out or unsubscribe.</li>
        </ul>
      </section>

      <section>
        <h2>7. Your Privacy Rights (GDPR & Global Standards)</h2>
        <p>
          Under GDPR and international privacy regulations, you have the right to access, rectify, or erase your
          personal data, restrict or object to processing, and request data portability. To submit a request,
          email <strong>{BRAND.email}</strong>. We review and process all verified requests within 30 days.
        </p>
        <p>
          You also have the right to lodge a complaint with your national supervisory authority (such as the
          Swedish Data Protection Authority, <strong>Integritetsskyddsmyndigheten / IMY</strong> at imy.se).
        </p>
      </section>

      <section>
        <h2>8. Cookies & Telemetry</h2>
        <p>
          We employ strictly necessary session cookies required for authentication and shopping cart persistence.
          We do not deploy third-party advertising cookies, behavioural retargeting pixels, or invasive cross-site trackers.
        </p>
      </section>

      <section>
        <h2>9. Contact & Amendments</h2>
        <p>
          Questions regarding data handling can be directed to <strong>{BRAND.email}</strong>.
        </p>
        <p>
          <em>Last updated: {LAST_UPDATED}.</em>
        </p>
      </section>
    </ContentPage>
  )
}

