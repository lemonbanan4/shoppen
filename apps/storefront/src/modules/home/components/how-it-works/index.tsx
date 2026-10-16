const STEPS = [
  {
    n: "01",
    title: "SELECT YOUR SILHOUETTE",
    body: "Choose your piece and size. Every garment is constructed to strict dimensional specs from XS to 2XL.",
  },
  {
    n: "02",
    title: "CRAFTED ON DEMAND",
    body: "Precision printed and assembled to order. Zero deadstock, zero warehouse waste, zero overproduction.",
  },
  {
    n: "03",
    title: "DIRECT DISPATCH",
    body: "Delivered direct to your door with end-to-end tracking. Hassle-free 30-day return policy.",
  },
]

export default function HowItWorks() {
  return (
    <section className="content-container pt-12 pb-2 small:pt-16 small:pb-4">
      <p className="text-[11px] font-mono tracking-[0.24em] uppercase text-[#00d4ff] mb-2">
        SYSTEM // PROCESS
      </p>
      <h2 className="text-2xl small:text-3xl font-mono font-bold tracking-tight text-white mb-10 small:mb-12 uppercase">
        ENGINEERED ON DEMAND // ZERO COMPROMISE
      </h2>
      <ol className="grid grid-cols-1 small:grid-cols-3 gap-8 small:gap-10">
        {STEPS.map((step) => (
          <li key={step.n} className="border-t border-neutral-800 pt-5">
            <p className="text-xs font-mono font-semibold tracking-[0.2em] text-[#00d4ff]">
              {step.n}
            </p>
            <p className="mt-3 text-base small:text-lg font-mono font-bold text-white uppercase">
              {step.title}
            </p>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed font-sans">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
