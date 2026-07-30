import LocalizedClientLink from "@modules/common/components/localized-client-link"

// A brand named "regret purchase" has to be in on its own joke, or the name
// reads as an accident. This band is where the site says the thing out loud.
export default function Manifesto({ countryCode }: { countryCode?: string }) {
  const isSv = countryCode === "se"

  return (
    <section className="bg-neutral-950 text-white">
      <div className="content-container py-16 small:py-24 max-w-4xl">
        <p className="text-[11px] tracking-[0.24em] uppercase text-brand-light mb-6">
          {isSv ? "Affärsidén" : "The business model"}
        </p>
        <p className="text-2xl small:text-4xl font-semibold leading-[1.2] tracking-[-0.02em] text-balance">
          {isSv ? (
            <>
              Vi säljer tröjor till folk som inte behöver fler tröjor.
              <span className="text-white/45">
                {" "}
                Det är hela affärsidén.
              </span>
            </>
          ) : (
            <>
              We sell shirts to people who do not need more shirts.
              <span className="text-white/45"> That is the whole model.</span>
            </>
          )}
        </p>
        <p className="mt-7 max-w-xl text-sm small:text-base text-white/65 leading-relaxed">
          {isSv
            ? "Ångerköp betyder precis vad du tror. Vi gör plagg för dig som lägger saker i kundvagnen kl 02:47 och ångrar det på söndag — men som ändå vill ha något som håller. Ekologisk bomull, tryckt i EU, inget lager."
            : "Ångerköp means “regret purchase”. We make clothes for people who add things to the basket at 02:47 and think better of it by Sunday — but still want something that lasts. Organic cotton, printed in the EU, no warehouse."}
        </p>
        <LocalizedClientLink
          href="/content/about"
          className="mt-9 inline-block text-sm font-medium text-white border-b border-white/30 pb-1 hover:border-white transition-colors"
        >
          {isSv ? "Mer om oss" : "More about us"}
        </LocalizedClientLink>
      </div>
    </section>
  )
}
