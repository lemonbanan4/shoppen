import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"

export const metadata: Metadata = {
  title: "About",
  description:
    "Solkast is an independent streetwear label — original graphic capsules, printed to order in the EU and US.",
}

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="About"
      title="Made in small batches, on purpose"
      intro="Solkast is an independent streetwear label. Every piece starts as a drawing, not a trend report."
    >
      <section>
        <h2>The idea</h2>
        <p>
          Most graphic tees are either a logo you're paying to advertise, or a
          joke that stops being funny the second time you wear it. We wanted the
          third thing: pieces with an actual point of view, cut and printed well
          enough that you keep reaching for them.
        </p>
        <p>
          Each capsule is its own running joke — a club you're quietly admitting
          you belong to. Overthinking Club. Retail Therapy. Bed Rotting. The
          designs are drawn in-house, as vectors, so every line stays sharp at
          any size.
        </p>
      </section>
      <section>
        <h2>How it's made</h2>
        <ul>
          <li>
            Organic, heavyweight blanks — mostly Stanley/Stella, GOTS-certified
            cotton with a proper oversized cut.
          </li>
          <li>
            Printed to order in the EU and US, close to you, so nothing is
            shipped across the planet and nothing sits in a warehouse.
          </li>
          <li>
            No overstock, no end-of-season landfill. We only make what someone
            actually wants.
          </li>
        </ul>
      </section>
      <section>
        <h2>Printed to order</h2>
        <p>
          Because each piece is made after you order it, dispatch takes a couple
          of days longer than a warehouse would. That's the trade: slightly more
          patience from you, dramatically less waste from us.
        </p>
      </section>
      <section>
        <h2>Say hello</h2>
        <p>
          Questions, ideas, or a design you want to see exist? Email{" "}
          <strong>hello@solkast.com</strong> — a person reads it.
        </p>
      </section>
    </ContentPage>
  )
}
