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
      title="Garments engineered to outlast the system."
      intro="Solkast is an independent Swedish label operating at the intersection of Y2K brutalism and modern luxury. We produce highly curated capsule collections using heavyweight organic cotton, printing each artifact only when it is claimed."
    >
      <section>
        <h2>The origin</h2>
        <p>
          <em>Solkast</em> is Swedish for the sudden throw of light. Not the sun itself, but the flare of it—the high-contrast distortion when light hits an object in the dark. It is the shape a silhouette makes out of the corner of your eye. That is the blueprint for our design: stark, unignorable, and built to be worn heavily.
        </p>
      </section>

      <section>
        <h2>The capsule protocol</h2>
        <p>
          We do not design to fill a seasonal grid. We operate on curated capsules. A larger range usually means mass production and deadstock, and the customer ends up paying for the waste. We stop at what is strictly necessary. Every piece exists for a reason.
        </p>
      </section>

      <section>
        <h2>How it is manufactured</h2>
        <ul>
          <li>
            <b>The Blank:</b> Ultra-heavyweight organic ring-spun cotton, specifically chosen to hold a structured, relaxed, and oversized drape long past the first year.
          </li>
          <li>
            <b>The Network:</b> Printed strictly to order across our decentralized production hubs in the US and EU. No central warehouse, no deadstock, and no end-of-season pallets going into landfills.
          </li>
          <li>
            <b>The Fit:</b> Dropped shoulders and aggresive, baggy cuts drafted to sit the same on most bodies. Sizes S through 2XL.
          </li>
        </ul>
      </section>

      <section>
        <h2>The trade-off</h2>
        <p>
          Because your garment does not exist until you initiate the order, delivery takes a few days longer than pulling something off a fast-fashion shelf. That is the trade: a little more patience from you, zero waste from us.
        </p>
      </section>

      <section>
        <h2>Connect</h2>
        <p>
          Questions, or looking for an archived piece? Transmission link: <strong>{BRAND.email}</strong> — a human reads it.
        </p>
      </section>
    </ContentPage>
  )
}
