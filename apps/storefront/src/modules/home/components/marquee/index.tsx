import { isSolkast } from "@lib/brand"

// Technical, aggressive capsule terminology for the Solkast AEON collection.
// Reflects the Y2K Cyber Sigilism / Neo-Futurism aesthetic of the Matrix and Horizon prints.
const AEON_SEQUENCE = [
  "AEON CAPSULE",
  "NO FUTURE ONLY THE INFINITE NOW",
  "TRANSCEND",
  "EVOLVE",
  "ASCEND",
  "CYBER SIGILISM INITIATIVE",
]

const ANGERKOP_PHRASES = [
  "ORKAR INTE",
  "VARNING: IMPULSKÖP",
  "LAGOM DELULU",
  "DET LÖSER SIG (FÖRMODLIGEN)",
  "UTBRÄND MEN MYSIG",
  "CAN'T EVEN",
]

// Repeat sequence so each half-track is sufficiently wide for ultra-wide displays
const SOLKAST_PHRASES = [...AEON_SEQUENCE, ...AEON_SEQUENCE]

const PHRASES = isSolkast ? SOLKAST_PHRASES : ANGERKOP_PHRASES

export default function Marquee() {
  // Rendered twice back to back: the track is translated by exactly -50%, so
  // the second copy sits where the first started and the loop is seamless.
  const track = [...PHRASES, ...PHRASES]
  const isDark = isSolkast

  return (
    <section
      aria-hidden="true"
      className={
        isDark
          ? "bg-black text-[#00d4ff] border-y border-[#00d4ff]/20 overflow-hidden"
          : "bg-brand text-white border-y border-white/10 overflow-hidden"
      }
    >
      <div className="flex w-max animate-marquee motion-reduce:animate-none py-3.5">
        {track.map((phrase, i) => (
          <div key={i} className="flex items-center shrink-0">
            <span
              className={
                isDark
                  ? "text-xs small:text-sm font-mono font-medium tracking-[0.25em] uppercase whitespace-nowrap text-[#00d4ff]"
                  : "text-xs small:text-sm font-semibold tracking-[0.2em] uppercase whitespace-nowrap"
              }
            >
              {phrase}
            </span>
            <span
              className={
                isDark
                  ? "mx-6 small:mx-8 text-[#00d4ff]/40 select-none font-mono"
                  : "mx-6 small:mx-9 text-white/40 select-none"
              }
            >
              {isDark ? "//" : "•"}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
