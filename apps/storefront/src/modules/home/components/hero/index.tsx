import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { isSolkast } from "@lib/brand"
import { featuredTiles, type FeaturedTile } from "@modules/home/featured"
import HeroVideo from "@modules/home/components/hero-video"

// Our own generated mockups, not stock photography of someone else's clothes.
const MOCKUPS =
  "https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets/main/mockups"

// The products every one of these points at has to still exist — an earlier
// hero pointed at Solkast-era ids that outlived the products themselves.
// No prices here on purpose: this renders for every region, and a hardcoded
// SEK figure would be wrong for EUR and USD visitors.
const STRIP = [
  {
    src: `${MOCKUPS}/pf-453013477-0.jpg`,
    alt: "ORKAR INTE Hoodie i svart ekologisk bomull",
    href: "/products/orkar-inte-hoodie",
    label: "ORKAR INTE Hoodie",
    tag: "Ny",
  },
  {
    src: `${MOCKUPS}/pf-452915689-0.jpg`,
    alt: "VARNING: Impulsköp tee — gul varningsetikett på svart",
    href: "/products/varning-impulskop-tee",
    label: "VARNING: Impulsköp",
  },
  {
    src: `${MOCKUPS}/pf-452915678-0.jpg`,
    alt: "ORKAR INTE tee — vit text på svart ekologisk t-shirt",
    href: "/products/orkar-inte-tee",
    label: "ORKAR INTE Tee",
  },
  {
    src: `${MOCKUPS}/pf-452915702-0.jpg`,
    alt: "LAGOM DELULU tee — vit text på svart ekologisk t-shirt",
    href: "/products/lagom-delulu-tee",
    label: "LAGOM DELULU",
  },
]

const Hero = async ({ countryCode }: { countryCode: string }) => {
  // Ångerköp's strip is hand-picked, one line of copy per design. Solkast has
  // no per-piece writing, so its tiles come from the catalogue — hardcoding
  // them is exactly how this hero ended up showing another brand's shirts.
  const strip: FeaturedTile[] = isSolkast
    ? await featuredTiles(countryCode, 4)
    : STRIP

  // Opt-in, not a hardcoded path: an unset variable leaves the existing
  // typographic hero exactly as it is, rather than a black hole where a video
  // was meant to be.
  const videoSrc = process.env.NEXT_PUBLIC_HERO_VIDEO_URL
  const videoPoster = process.env.NEXT_PUBLIC_HERO_VIDEO_POSTER

  return (
    <section className="relative bg-neutral-950 text-white">
      {videoSrc && <HeroVideo src={videoSrc} poster={videoPoster} />}
      <div className="relative content-container pt-16 pb-12 small:pt-24 small:pb-16">
        <p className="text-[11px] small:text-xs tracking-[0.28em] uppercase text-brand-light">
          {isSolkast
            ? "Chase the light. Become the standard."
            : "Svenska kapseln — nu i fyra färger"}
        </p>
        {/* The product is type, so the page leads with type too. Leading has
            to clear Å and Ö rings against the previous line's descenders —
            the usual sub-1 display leading collides in Swedish. */}
        <h1 className="mt-5 text-[3.25rem] leading-[1.06] small:text-[7rem] small:leading-[1.02] font-semibold tracking-[-0.03em] text-balance">
          {isSolkast ? (
            <>
              Chase
              <br />
              <span className="text-brand-light">the light.</span>
            </>
          ) : (
            <>
              Köp nu.
              <br />
              <span className="text-brand-light">Ångra sen.</span>
            </>
          )}
        </h1>
        <div className="mt-8 small:mt-10 flex flex-col small:flex-row small:items-end gap-8 small:gap-14">
          <p className="max-w-sm text-sm small:text-base text-white/70 leading-relaxed">
            {isSolkast
              ? "Graphic pieces in heavy organic cotton, printed to order in the EU. A short list, made properly, meant to outlast the season."
              : "Tröjor för dig som redan vet hur det slutar. Ekologisk bomull, tryckt på beställning i EU — vi gör bara det någon faktiskt beställt."}
          </p>
          <div className="flex gap-3 shrink-0">
            <LocalizedClientLink
              href="/store"
              className="bg-white text-neutral-950 text-sm font-medium px-7 py-3.5 rounded-full hover:bg-neutral-200 transition-colors"
              data-testid="hero-shop-link"
            >
              {isSolkast ? "Shop all" : "Handla allt"}
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/collections/new-arrivals"
              className="border border-white/30 text-white text-sm font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-colors"
            >
              {isSolkast ? "New arrivals" : "Nyheter"}
            </LocalizedClientLink>
          </div>
        </div>
      </div>

      {/* A shoppable strip rather than a decorative collage — every tile is a
          real product page. */}
      <div className="relative content-container pb-16 small:pb-20">
        <div className="grid grid-cols-2 small:grid-cols-4 gap-3 small:gap-4">
          {strip.map((item, i) => (
            <LocalizedClientLink
              key={item.href}
              href={item.href}
              className="group"
            >
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-neutral-900">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
                {/* On the image, not beside the title — in a grid, a badge in
                    the text row reads as belonging to the next column. */}
                {item.tag && (
                  <span className="absolute top-3 left-3 bg-brand text-white text-[10px] font-semibold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full">
                    {item.tag}
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs small:text-sm text-white/90 truncate">
                {item.label}
              </p>
            </LocalizedClientLink>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Hero
