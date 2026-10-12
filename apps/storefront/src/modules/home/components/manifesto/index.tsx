import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { isSolkast } from "@lib/brand"
import { FULFILMENT, shippingRegionFor } from "@lib/copy"

// A brand named "regret purchase" has to be in on its own joke, or the name
// reads as an accident. This band is where the site says the thing out loud.
//
// Solkast is the inverse and gets its own copy rather than a translation:
// the whole proposition is that it does not perform. Running the Ångerköp
// line through it in English would land as a joke told flatly, which is
// worse than either brand on its own.
export default function Manifesto() {
  return (
    <section className="bg-black border-y border-neutral-900 text-white">
      <div className="content-container py-16 small:py-24 max-w-4xl">
        <p className="text-[11px] font-mono tracking-[0.24em] uppercase text-[#00d4ff] mb-6">
          BRAND ETHOS // 001
        </p>

        <p className="text-2xl small:text-4xl font-mono font-bold leading-[1.2] tracking-tight uppercase text-white">
          SOLKAST IS THE WAY LIGHT GETS THROWN.
          <span className="text-neutral-500 block mt-1">
            NOT THE SUN — THE SHADOW AND THE CAST OF IT.
          </span>
        </p>

        <p className="mt-7 max-w-xl text-sm small:text-base text-neutral-400 font-sans leading-relaxed">
          The long shadow at four in the afternoon; the stark profile formed when light strikes sideways. Heavyweight garments engineered with high-density graphics and enduring cuts. Designed to be lived in for years rather than chased for a season.
        </p>

        <LocalizedClientLink
          href="/about"
          className="mt-9 inline-block text-xs font-mono uppercase tracking-widest text-white border-b border-white/40 pb-1 hover:border-[#00d4ff] hover:text-[#00d4ff] transition-all"
        >
          ABOUT SOLKAST →
        </LocalizedClientLink>
      </div>
    </section>
  )
}
