// Swedish shoppers get their own threshold in SEK; everyone else keeps EUR,
// matching the announcement bar in the nav.
const uspsFor = (countryCode?: string) =>
  countryCode === "se"
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
        { title: "Free EU shipping", detail: "On orders over €75" },
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
