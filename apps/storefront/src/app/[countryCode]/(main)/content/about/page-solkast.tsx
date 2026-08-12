import ContentPage from "@modules/common/components/content-page"
import { BRAND } from "@lib/brand"

/**
 * Solkast's about page.
 *
 * Kept in its own file rather than branched inline: the two brands share
 * nothing here but the legal entity, and interleaving two voices in one
 * component makes both harder to edit without disturbing the other.
 *
 * The voice is the inverse of Ångerköp's. Ångerköp is in on its own joke and
 * says so; Solkast does not joke, and the restraint is the point.
 */
export default function AboutSolkast() {
  return (
    <ContentPage
      eyebrow="About"
      title="Clothes that are meant to last longer than a season."
      intro="Solkast is a small Swedish label. We make a short list of pieces in organic cotton, print each one only once it is ordered, and stop there."
    >
      <section>
        <h2>The name</h2>
        <p>
          <em>Solkast</em> is Swedish for the way light gets thrown. Not the
          sun itself — the cast of it. The long shadow at four in the
          afternoon, the shape a thing makes when the light hits it sideways.
        </p>
        <p>
          That felt like the right idea for clothes meant to be worn for years
          rather than noticed for a season. Something you register out of the
          corner of your eye and keep reaching for.
        </p>
      </section>

      <section>
        <h2>The list is short on purpose</h2>
        <p>
          There are twelve pieces. That is not a soft launch — it is the
          intended size. A larger range would mean designing to fill a grid
          rather than because a piece needed to exist, and you would end up
          paying for the difference.
        </p>
      </section>

      <section>
        <h2>How it is made</h2>
        <ul>
          <li>
            Organic ring-spun cotton, mid to heavy weight, chosen so a piece
            holds its shape past the first year.
          </li>
          <li>
            Printed to order at our production partner&apos;s EU facilities.
            No warehouse, no deadstock, no end-of-season pallet going
            somewhere it should not.
          </li>
          <li>
            Relaxed and oversized cuts, drafted to sit the same on most
            bodies. Sizes S through 2XL.
          </li>
        </ul>
      </section>

      <section>
        <h2>Printed to order</h2>
        <p>
          Because each piece is made after you order it, delivery takes a few
          days longer than pulling something off a shelf would. That is the
          trade: a little more patience from you, considerably less waste from
          us.
        </p>
      </section>

      <section>
        <h2>Say hello</h2>
        <p>
          Questions, or a piece you would like to see exist? Email{" "}
          <strong>{BRAND.email}</strong> — a person reads it.
        </p>
      </section>
    </ContentPage>
  )
}
