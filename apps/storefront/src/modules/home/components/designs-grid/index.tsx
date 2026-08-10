import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { isSolkast } from "@lib/brand"
import { featuredTiles } from "@modules/home/featured"

const MOCKUPS =
  "https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets/main/mockups"

// This replaces a "shop by category" grid. With one apparel category and a
// handful of products, departments were an empty abstraction — what a visitor
// actually chooses between is the six lines, so the page offers those instead.
const DESIGNS = [
  {
    href: "/products/orkar-inte-tee",
    src: `${MOCKUPS}/pf-452915678-0.jpg`,
    name: "ORKAR INTE",
    gloss: "För dagar då duschen är ett projekt.",
    alt: "ORKAR INTE tee på svart ekologisk bomull",
  },
  {
    href: "/products/varning-impulskop-tee",
    src: `${MOCKUPS}/pf-452915689-0.jpg`,
    name: "VARNING: Impulsköp",
    gloss: "En varningsetikett på dig själv.",
    alt: "VARNING: Impulsköp tee med gul varningsetikett",
  },
  {
    href: "/products/lagom-delulu-tee",
    src: `${MOCKUPS}/pf-452915702-0.jpg`,
    name: "LAGOM DELULU",
    gloss: "Exakt rätt mängd osund optimism.",
    alt: "LAGOM DELULU tee på svart ekologisk bomull",
  },
  {
    href: "/products/det-loser-sig-tee",
    src: `${MOCKUPS}/pf-452915713-0.jpg`,
    name: "DET LÖSER SIG",
    gloss: "(Förmodligen.) Ingen garanti lämnas.",
    alt: "DET LÖSER SIG tee på svart ekologisk bomull",
  },
  {
    href: "/products/utbrand-men-mysig-tee",
    src: `${MOCKUPS}/pf-452915734-0.jpg`,
    name: "UTBRÄND MEN MYSIG",
    gloss: "Trasig, men i mjukt tyg.",
    alt: "UTBRÄND MEN MYSIG tee på svart ekologisk bomull",
  },
  {
    href: "/products/can-t-even-tee",
    src: `${MOCKUPS}/pf-452915695-0.jpg`,
    name: "CAN'T EVEN",
    gloss: "Ingen översättning behövs.",
    alt: "CAN'T EVEN tee på svart ekologisk bomull",
  },
]

export default async function DesignsGrid({
  countryCode,
}: {
  countryCode: string
}) {
  // Ångerköp's six are hand-written, one gloss each. Solkast reads its own
  // catalogue: the grid used to render Ångerköp shirts on solkast.com,
  // linking to handles that do not exist on the Solkast channel.
  const tiles = isSolkast
    ? (await featuredTiles(countryCode, 6)).map((t) => ({
        href: t.href,
        src: t.src,
        alt: t.alt,
        name: t.label,
        gloss: "",
      }))
    : DESIGNS

  if (!tiles.length) {
    return null
  }

  return (
    <section className="content-container py-14 small:py-20">
      <div className="flex flex-col xsmall:flex-row xsmall:items-end justify-between gap-4 mb-8 small:mb-10">
        <div>
          <p className="text-[11px] tracking-[0.24em] uppercase text-brand mb-2">
            {isSolkast ? "The collection" : "Kollektionen"}
          </p>
          <h2 className="text-2xl small:text-3xl font-semibold tracking-[-0.02em] text-neutral-950">
            {isSolkast
              ? "Made to be worn out, not put away"
              : "Sex sätt att säga att du inte orkar"}
          </h2>
        </div>
        <LocalizedClientLink
          href="/store"
          className="text-sm text-neutral-500 hover:text-neutral-950 transition-colors shrink-0 underline underline-offset-4 decoration-neutral-300"
        >
          {isSolkast ? "See all" : "Se alla"}
        </LocalizedClientLink>
      </div>

      <div className="grid grid-cols-2 small:grid-cols-3 gap-x-3 gap-y-8 small:gap-x-6 small:gap-y-10">
        {tiles.map((d) => (
          <LocalizedClientLink key={d.href} href={d.href} className="group">
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-neutral-100">
              <Image
                src={d.src}
                alt={d.alt}
                fill
                sizes="(max-width: 1024px) 50vw, 33vw"
                className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              />
            </div>
            <p className="mt-3.5 text-sm small:text-base font-medium text-neutral-950">
              {d.name}
            </p>
            {d.gloss ? (
              <p className="mt-1 text-xs small:text-sm text-neutral-500 leading-snug">
                {d.gloss}
              </p>
            ) : null}
          </LocalizedClientLink>
        ))}
      </div>
    </section>
  )
}
