import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { isSolkast } from "@lib/brand"

// A split panel, not a full-bleed photo. All our imagery is studio mockups on
// white, so stretching one behind text gives washed-out grey margins and puts
// the garment's own printed words directly under the heading. Splitting keeps
// the product on its own ground and the type on ours.
export default function EditorialBanner({
  countryCode,
}: {
  countryCode?: string
}) {
  const isSv = countryCode === "se"

  // This panel is a spotlight on one specific garment — the ORKAR INTE hoodie.
  // Solkast's catalogue is fourteen tees and no hoodie, so on that storefront
  // the banner showed another brand's product and linked to a handle that 404s
  // on its own channel. Nothing here generalises, so it simply does not run:
  // an honest gap beats a fabricated spotlight.
  if (isSolkast) {
    return null
  }

  return (
    <section className="content-container py-12 small:py-16">
      <div className="grid grid-cols-1 small:grid-cols-2 rounded-2xl overflow-hidden bg-neutral-950">
        <div className="relative aspect-[4/3] small:aspect-auto small:min-h-[460px] bg-neutral-100 order-1 small:order-2">
          <Image
            src="https://raw.githubusercontent.com/lemonbanan4/shoppen-merch-assets/main/mockups/pf-453013477-0.jpg"
            alt={
              isSv
                ? "ORKAR INTE Hoodie i svart ekologisk bomull"
                : "ORKAR INTE Hoodie in black organic cotton"
            }
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center"
          />
        </div>
        <div className="order-2 small:order-1 flex flex-col justify-center text-white px-7 py-12 small:px-12 small:py-16">
          <p className="text-[11px] tracking-[0.24em] uppercase text-brand-light mb-4">
            {isSv ? "Ny — hoodie" : "New — hoodie"}
          </p>
          <h2 className="text-3xl small:text-4xl font-semibold tracking-[-0.02em] leading-[1.1] text-balance">
            {isSv
              ? "För dagar du inte orkar alls."
              : "For days you cannot at all."}
          </h2>
          <p className="mt-5 max-w-sm text-sm small:text-base text-white/70 leading-relaxed">
            {isSv
              ? "Samma rad, tyngre plagg. Mid-weight hoodie i ekologisk bomull från Stanley/Stella — fyra färger, S–2XL."
              : "Same line, heavier garment. Mid-weight organic cotton hoodie by Stanley/Stella — four colours, S–2XL."}
          </p>
          <LocalizedClientLink
            href="/products/orkar-inte-hoodie"
            className="mt-8 self-start bg-white text-neutral-950 text-sm font-medium px-7 py-3.5 rounded-full hover:bg-neutral-200 transition-colors"
          >
            {isSv ? "Handla hoodien" : "Shop the hoodie"}
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}
