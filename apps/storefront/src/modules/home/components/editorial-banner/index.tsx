import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

export default function EditorialBanner() {
  return (
    <section className="content-container py-12 small:py-16">
      <div className="relative rounded-2xl overflow-hidden h-[380px] small:h-[460px]">
        <Image
          src="https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets/main/mockups/pf-452120542-0.jpg"
          alt="Warning Impulse tee — yellow warning label print on a black oversized tee"
          fill
          sizes="(max-width: 1440px) 100vw, 1440px"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-neutral-950/45" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
          <p className="text-[11px] tracking-[0.24em] uppercase text-white/80 mb-3">
            The capsules
          </p>
          <h2 className="text-3xl small:text-4xl font-medium max-w-lg text-balance">
            Wear the bit.
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/85">
            Every capsule is its own running joke — small batches on organic
            heavyweight blanks, printed when you order.
          </p>
          <LocalizedClientLink
            href="/collections/new-arrivals"
            className="mt-7 bg-white text-neutral-950 text-sm font-medium px-7 py-3.5 rounded-full hover:bg-neutral-200 transition-colors"
          >
            Shop new arrivals
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}
