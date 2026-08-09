import { isSolkast } from "@lib/brand"

// Two independent axes, and conflating them is what produced the mixed-up
// chrome elsewhere. Language follows the brand+route (Solkast is English even
// on /se); the shipping threshold follows the region alone, because 800 kr is
// what the Swedish cart actually charges regardless of what language the
// visitor reads.
const uspsFor = (countryCode?: string) =>
  !isSolkast && countryCode === "se"
    ? [
        {
          title: "Ångerrätt, såklart",
          detail: "30 dagars retur. Vi är uppkallade efter känslan.",
        },
        { title: "Fri frakt över 800 kr", detail: "Skickas från EU, 2–7 dagar." },
        {
          title: "Ekologisk bomull",
          detail: "Stanley/Stella, GOTS-certifierad.",
        },
        {
          title: "Tryckt på beställning",
          detail: "Inget lager, ingen överproduktion.",
        },
      ]
    : [
        {
          title: "30-day returns",
          detail: "We are named after the feeling.",
        },
        // The SEK threshold is the one the Swedish cart actually applies, so
        // an English-speaking visitor on /se must be quoted that, not €75.
        countryCode === "se"
          ? { title: "Free shipping", detail: "On orders over 800 kr" }
          : { title: "Free EU shipping", detail: "On orders over €75" },
        { title: "Organic cotton", detail: "Stanley/Stella, GOTS certified." },
        { title: "Printed to order", detail: "No warehouse, no overproduction." },
      ]

export default function UspBar({ countryCode }: { countryCode?: string }) {
  return (
    <section className="border-b border-neutral-100 bg-neutral-50">
      <div className="content-container grid grid-cols-2 small:grid-cols-4 gap-x-6 gap-y-5 py-7">
        {uspsFor(countryCode).map((usp) => (
          <div key={usp.title}>
            <p className="text-sm font-medium text-neutral-900">{usp.title}</p>
            <p className="text-xs text-neutral-500 mt-1 leading-snug">
              {usp.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
