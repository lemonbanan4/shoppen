import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms that apply when you shop with Shoppen.",
}

export default function TermsOfUsePage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Terms of use"
      intro="The plain-language version of what you agree to when ordering from Shoppen."
    >
      <section>
        <h2>Orders & pricing</h2>
        <p>
          All prices are shown including applicable VAT. An order is accepted
          when you receive our order confirmation email. In the rare case of a
          pricing error or stock issue, we may cancel and fully refund the
          affected items before they ship.
        </p>
      </section>
      <section>
        <h2>Delivery</h2>
        <p>
          Delivery estimates are shown at checkout and in our shipping policy.
          Risk passes to you on delivery of the goods.
        </p>
      </section>
      <section>
        <h2>Returns & withdrawal</h2>
        <p>
          You have a 30-day return window from delivery — longer than the EU's
          statutory 14-day right of withdrawal. Details are in our Shipping &amp;
          returns policy.
        </p>
      </section>
      <section>
        <h2>Accounts</h2>
        <p>
          You're responsible for keeping your account credentials safe. We may
          suspend accounts used fraudulently or abusively.
        </p>
      </section>
      <section>
        <h2>Liability</h2>
        <p>
          Nothing in these terms limits your statutory consumer rights. Our
          liability is otherwise limited to the value of the order concerned.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms: <strong>hello@shoppen.example</strong>.
        </p>
      </section>
    </ContentPage>
  )
}
