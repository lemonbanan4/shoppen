import { isSolkast } from "@lib/brand"

// The capsule's lines, running as a ticker. It does the job a hero tagline
// can't: shows the whole joke at a glance, so a first-time visitor learns the
// brand's register in one pass rather than one product at a time.
//
// Which means it has to be the *right* capsule. Solkast was running Ångerköp's
// Swedish punchlines — an English shop scrolling "UTBRÄND MEN MYSIG" past a
// visitor in Toronto, in a voice that belongs to a different company.
const ANGERKOP_PHRASES = [
  "ORKAR INTE",
  "VARNING: IMPULSKÖP",
  "LAGOM DELULU",
  "DET LÖSER SIG (FÖRMODLIGEN)",
  "UTBRÄND MEN MYSIG",
  "CAN'T EVEN",
]

// Solkast's own designs, in its own register. Same trick, different joke:
// these are the actual pieces in the shop, so the ticker doubles as a
// contents page.
// Kept in step with CURATED by hand, which is the cost of a ticker that
// doubles as a contents page: Late Bloom was dropped from the shop and left
// scrolling across the homepage advertising a product that 404s.
const SOLKAST_PHRASES = [
  "CHASE THE LIGHT",
  "BUILT IN SUNLIGHT",
  "FROM SHADOW",
  "DRIVEN BY LIGHT",
  "TOTAL ECLIPSE",
  "GLOW DIFFERENT",
  "STAY GOLDEN",
  "SOLSTICE",
]

const PHRASES = isSolkast ? SOLKAST_PHRASES : ANGERKOP_PHRASES

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
