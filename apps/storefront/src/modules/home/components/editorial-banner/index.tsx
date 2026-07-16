import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

export default function EditorialBanner() {
  return (
    <section className="content-container py-12 small:py-16">
      <div className="relative rounded-2xl overflow-hidden h-[380px] small:h-[460px]">
        <Image
          src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=2000&q=80&auto=format"
          alt="Garment-dyed shirts on wooden hangers"
          fill
          sizes="(max-width: 1440px) 100vw, 1440px"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-neutral-950/35" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
          <p className="text-[11px] tracking-[0.24em] uppercase text-white/80 mb-3">
            The edit
          </p>
          <h2 className="text-3xl small:text-4xl font-medium max-w-lg text-balance">
            Fewer, better things
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/85">
            Our essentials are the pieces we reach for every day — cut well,
            made honestly, priced fairly.
          </p>
          <LocalizedClientLink
            href="/collections/essentials"
            className="mt-7 bg-white text-neutral-950 text-sm font-medium px-7 py-3.5 rounded-full hover:bg-neutral-200 transition-colors"
          >
            Shop the essentials
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}
