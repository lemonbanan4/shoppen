import { SHIPPING_PROMISE, shippingRegionFor } from "@lib/copy"

const uspsFor = (countryCode?: string) => [
  {
    title: "ENGINEERED SILHOUETTES",
    detail: "Heavyweight blanks & tailored drape.",
  },
  {
    title: SHIPPING_PROMISE[shippingRegionFor(countryCode)].uspTitle,
    detail: SHIPPING_PROMISE[shippingRegionFor(countryCode)].uspDetail,
  },
  {
    title: "PRINTED ON DEMAND",
    detail: "Zero deadstock, zero overproduction.",
  },
  {
    title: "EFFORTLESS 30-DAY RETURNS",
    detail: "Hassle-free worldwide guarantee.",
  },
]

export default function UspBar({ countryCode }: { countryCode?: string }) {
  return (
    <section className="border-y border-neutral-900 bg-black/90 backdrop-blur-md">
      <div className="content-container grid grid-cols-2 small:grid-cols-4 gap-x-6 gap-y-5 py-7">
        {uspsFor(countryCode).map((usp) => (
          <div key={usp.title}>
            <p className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">
              {usp.title}
            </p>
            <p className="text-xs text-neutral-400 mt-1 leading-snug font-sans">
              {usp.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
