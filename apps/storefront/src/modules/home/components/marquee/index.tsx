// The capsule's lines, running as a ticker. It does the job a hero tagline
// can't: shows the whole joke at a glance, so a first-time visitor learns the
// brand's register in one pass rather than one product at a time.
const PHRASES = [
  "ORKAR INTE",
  "VARNING: IMPULSKÖP",
  "LAGOM DELULU",
  "DET LÖSER SIG (FÖRMODLIGEN)",
  "UTBRÄND MEN MYSIG",
  "CAN'T EVEN",
]

export default function Marquee() {
  // Rendered twice back to back: the track is translated by exactly -50%, so
  // the second copy sits where the first started and the loop is seamless.
  const track = [...PHRASES, ...PHRASES]

  return (
    <section
      aria-hidden="true"
      className="bg-brand text-white border-y border-white/10 overflow-hidden"
    >
      <div className="flex w-max animate-marquee motion-reduce:animate-none py-3.5">
        {track.map((phrase, i) => (
          <div key={i} className="flex items-center shrink-0">
            <span className="text-xs small:text-sm font-semibold tracking-[0.2em] uppercase whitespace-nowrap">
              {phrase}
            </span>
            <span className="mx-6 small:mx-9 text-white/40 select-none">•</span>
          </div>
        ))}
      </div>
    </section>
  )
}
