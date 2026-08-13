import { isSolkast } from "@lib/brand"
import { SHIPPING_PROMISE, shippingRegionFor } from "@lib/copy"

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
        // Shared with the announcement bar rather than written out again: the
        // two ladders had already diverged, which is how a dollar storefront
        // ended up quoting €75 and 41 Rest-of-World countries were promised a
        // threshold their cart has no option to reach.
        {
          title: SHIPPING_PROMISE[shippingRegionFor(countryCode)].uspTitle,
          detail: SHIPPING_PROMISE[shippingRegionFor(countryCode)].uspDetail,
        },
        // "Organic cotton — Stanley/Stella, GOTS certified" is a certification
        // claim, and certification claims are the ones that get checked. It is
        // true of the tees, hoodies and sweatshirts and false of the Solstice
        // range, which is recycled polyester because sublimation does not bond
        // to cotton. Narrowed to what holds across everything on the site.
        {
          title: "Considered blanks",
          detail: "Organic cotton and recycled polyester.",
        },
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
