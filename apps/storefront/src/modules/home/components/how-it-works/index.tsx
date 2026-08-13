// Print-on-demand needs explaining: nothing ships from a warehouse, so the
// two questions a first-time visitor has are "will this actually arrive" and
// "why does it take a few days". With no reviews on the store yet, answering
// those plainly is the closest thing to social proof available.
import { FULFILMENT, shippingRegionFor } from "@lib/copy"

const stepsFor = (isSv: boolean, countryCode?: string) =>
  isSv
    ? [
        {
          n: "01",
          title: "Du beställer",
          body: "Kl 02:47, om vi ska gissa. Välj färg och storlek — allt finns i S–2XL.",
        },
        {
          n: "02",
          title: "Vi trycker den",
          body: "På beställning hos vårt tryckeri i EU. Inget lager, inga osålda lådor, ingen överproduktion.",
        },
        {
          n: "03",
          title: "Den kommer",
          body: "Oftast inom 2–7 dagar. Ändrar du dig har du 30 dagars ångerrätt — vi tar det inte personligt.",
        },
      ]
    : [
        {
          n: "01",
          title: "You order",
          // Not "everything comes in S–2XL" any more. The bucket hat is S/M
          // and L/XL, the duffle is one size, and several pieces start at XS.
          // A size claim on the homepage is the kind of detail a shopper takes
          // literally and then finds untrue on the product page.
          body: "Pick a colour and size — most pieces run XS to 2XL.",
        },
        {
          n: "02",
          title: "We print it",
          // "our EU printer" survived the move to US-only fulfilment and was
          // contradicting the hero, the footer and every product page, which
          // all say the US. Reads from the same region-aware copy layer as
          // those, so there is now one place that can be wrong.
          body: `Made to order ${
            FULFILMENT[shippingRegionFor(countryCode)].printedIn
          }. No warehouse, no unsold boxes, no overproduction.`,
        },
        {
          n: "03",
          title: "It arrives",
          body: "Usually within 2–7 days. Change your mind and you have 30 days to return it — no hard feelings.",
        },
      ]

export default function HowItWorks({
  countryCode,
}: {
  countryCode?: string
}) {
  const isSv = countryCode === "se"

  return (
    <section className="content-container py-14 small:py-20">
      <p className="text-[11px] tracking-[0.24em] uppercase text-brand mb-2">
        {isSv ? "Så funkar det" : "How it works"}
      </p>
      <h2 className="text-2xl small:text-3xl font-semibold tracking-[-0.02em] text-neutral-950 mb-10 small:mb-12">
        {isSv ? "Ingen magi, bara tryck." : "No magic, just printing."}
      </h2>
      <ol className="grid grid-cols-1 small:grid-cols-3 gap-8 small:gap-10">
        {stepsFor(isSv, countryCode).map((step) => (
          <li key={step.n} className="border-t border-neutral-200 pt-5">
            <p className="text-xs font-semibold tracking-[0.2em] text-brand">
              {step.n}
            </p>
            <p className="mt-3 text-base small:text-lg font-medium text-neutral-950">
              {step.title}
            </p>
            <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
