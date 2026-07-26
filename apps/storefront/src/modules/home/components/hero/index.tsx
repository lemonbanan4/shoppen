import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

// The hero shows our own products — generated mockups re-hosted in the
// public assets repo — instead of stock photography of someone else's.
const MOCKUPS =
  "https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets/main/mockups"

const HERO_IMAGES = [
  {
    src: `${MOCKUPS}/pf-452139428-0.jpg`,
    alt: "Delulu Club tee — heart-glasses crest on white",
    tall: true,
  },
  {
    src: `${MOCKUPS}/pf-452120542-0.jpg`,
    alt: "Warning Impulse tee — yellow warning label on black",
    tall: false,
  },
  {
    src: `${MOCKUPS}/pf-451939140-0.jpg`,
    alt: "Skyline heavyweight hoodie — isometric city print on black",
    tall: false,
  },
]

const Hero = () => {
  return (
    <section className="bg-neutral-950 text-white">
      <div className="content-container py-14 small:py-24 grid grid-cols-1 small:grid-cols-2 gap-10 small:gap-16 items-center">
        <div>
          <p className="text-[11px] small:text-xs tracking-[0.24em] uppercase mb-4 text-white/70">
            New capsule — Delulu Club
          </p>
          <h1 className="text-4xl small:text-6xl font-medium leading-[1.05] text-balance">
            Streetwear, considered.
          </h1>
          <p className="mt-4 max-w-md text-sm small:text-base text-white/75">
            Original graphic capsules — small batch, printed to order on
            organic heavyweight blanks, built to actually wear.
          </p>
          <div className="mt-8 flex gap-3">
            <LocalizedClientLink
              href="/store"
              className="bg-white text-neutral-950 text-sm font-medium px-7 py-3.5 rounded-full hover:bg-neutral-200 transition-colors"
              data-testid="hero-shop-link"
            >
              Shop all
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/collections/new-arrivals"
              className="border border-white/40 text-white text-sm font-medium px-7 py-3.5 rounded-full hover:bg-white/10 transition-colors"
            >
              New arrivals
            </LocalizedClientLink>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 small:gap-4">
          {HERO_IMAGES.map((img, i) => (
            <div
              key={img.src}
              className={`relative rounded-xl overflow-hidden bg-neutral-100 ${
                img.tall ? "row-span-2 aspect-[3/4]" : "aspect-square"
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                priority={i === 0}
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover object-center"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Hero
