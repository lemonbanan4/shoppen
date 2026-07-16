const USPS = [
  { title: "Free EU shipping", detail: "On all orders over €75" },
  { title: "30-day returns", detail: "No questions asked" },
  { title: "Secure checkout", detail: "Encrypted end to end" },
  { title: "Built to last", detail: "Small batches, honest materials" },
]

export default function UspBar() {
  return (
    <section className="border-b border-neutral-100">
      <div className="content-container grid grid-cols-2 small:grid-cols-4 gap-x-6 gap-y-4 py-6">
        {USPS.map((usp) => (
          <div key={usp.title}>
            <p className="text-sm font-medium text-neutral-900">{usp.title}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{usp.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
