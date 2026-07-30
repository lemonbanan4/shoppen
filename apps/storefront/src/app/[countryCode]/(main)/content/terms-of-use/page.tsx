import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The terms that apply when you shop with Ångerköp, operated by CogCore LLC.",
}

const LAST_UPDATED = "30 July 2026"

export default function TermsOfUsePage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Terms of use"
      intro="The plain-language version of what you agree to when ordering from Ångerköp — written to be read, not to hide things."
    >
      <section>
        <h2>Who you are buying from</h2>
        <p>
          Ångerköp is a trading name of <strong>CogCore LLC</strong>, 30 N Gould
          St Ste R, Sheridan, WY 82801, United States. Contact:{" "}
          <strong>hej@angerkop.se</strong>.
        </p>
        <p>
          These terms apply to every order placed through angerkop.se. Nothing
          here reduces the consumer rights you have under the law of the country
          you live in.
        </p>
      </section>

      <section>
        <h2>Orders and pricing</h2>
        <p>
          Prices are shown in the currency of your selected region and include
          any taxes stated at checkout. Shipping is shown before you pay. A
          contract is formed when we send your order confirmation email — not
          when you click pay.
        </p>
        <p>
          If a genuine pricing or availability error occurs, we may cancel the
          affected items and refund you in full before they ship. We will always
          tell you if this happens.
        </p>
      </section>

      <section>
        <h2>Made to order</h2>
        <p>
          Every item is printed for you after you order, which is why delivery
          takes a few days longer than stock that sits in a warehouse. These are
          standard designs from our catalogue, not personalised goods — so your
          right to change your mind, below, applies in full.
        </p>
      </section>

      <section>
        <h2>Delivery</h2>
        <p>
          Estimated delivery times are shown at checkout and in our Shipping
          &amp; returns policy. We ship from within the EU. Risk passes to you
          when the goods are delivered.
        </p>
      </section>

      <section>
        <h2>Changing your mind</h2>
        <p>
          You have <strong>30 days</strong> from delivery to return an unworn,
          unwashed item in its original condition — more than the 14-day
          statutory right of withdrawal that applies to EU consumers. Start a
          return by emailing <strong>hej@angerkop.se</strong>.
        </p>
        <p>
          We refund to your original payment method once the return arrives.
          Return shipping is your responsibility unless the item is faulty or we
          sent the wrong thing.
        </p>
      </section>

      <section>
        <h2>Faulty or incorrect items</h2>
        <p>
          If an item arrives damaged, misprinted, or is not what you ordered,
          email us within a reasonable time with a photo and we will replace it
          or refund you in full, including any shipping you paid. This is in
          addition to, not instead of, your statutory rights.
        </p>
      </section>

      <section>
        <h2>Accounts</h2>
        <p>
          You are responsible for keeping your account credentials safe. We may
          suspend or close accounts used fraudulently or abusively.
        </p>
      </section>

      <section>
        <h2>Intellectual property</h2>
        <p>
          The designs, artwork and text on this site belong to CogCore LLC. You
          are buying a garment, not a licence to reproduce the artwork
          commercially.
        </p>
      </section>

      <section>
        <h2>Liability</h2>
        <p>
          Nothing in these terms excludes liability that cannot lawfully be
          excluded, and nothing limits your statutory consumer rights. Beyond
          that, our liability in connection with an order is limited to the
          value of that order.
        </p>
      </section>

      <section>
        <h2>Disputes</h2>
        <p>
          Please email us first — most things are fixed quickly and without
          formality. If you are an EU consumer and we cannot resolve it, you may
          use the European Commission&apos;s Online Dispute Resolution platform
          at ec.europa.eu/consumers/odr.
        </p>
        <p>
          As a consumer you keep the protection of the mandatory laws of your
          country of residence, and may bring proceedings there, regardless of
          where we are established.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms: <strong>hej@angerkop.se</strong>.
        </p>
        <p>
          <em>Last updated: {LAST_UPDATED}.</em>
        </p>
      </section>
    </ContentPage>
  )
}
