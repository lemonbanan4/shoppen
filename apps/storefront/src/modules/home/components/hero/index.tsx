import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

const Hero = () => {
  return (
    <section className="relative w-full h-[70vh] small:h-[82vh] overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1635650804060-bb009bcb2ea5?w=2400&q=80&auto=format"
        alt="Model in an oversized graphic-print tee standing in an urban lot"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 via-neutral-950/10 to-transparent" />
      <div className="absolute inset-0 flex items-end">
        <div className="content-container pb-14 small:pb-20 text-white">
          <p className="text-[11px] small:text-xs tracking-[0.24em] uppercase mb-4 text-white/80">
            New capsule — out now
          </p>
          <h1 className="text-4xl small:text-6xl font-medium leading-[1.05] max-w-2xl text-balance">
            Streetwear, considered.
          </h1>
          <p className="mt-4 max-w-md text-sm small:text-base text-white/80">
            Graphic tees, hoodies and caps — small batch, printed to order,
            built to actually wear.
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
      </div>
    </section>
  )
}

export default Hero
