import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Full-screen cinematic hero — Y2K Cyber Sigilism / Neo-Futurism.
 *
 * A looping background video fills the viewport behind a centered headline
 * and a glowing CTA. The video is muted + playsInline so every mobile browser
 * autoplays it without issues. A radial gradient overlay darkens the edges
 * and keeps the text legible regardless of the footage.
 *
 * The path defaults to /video/black-garment.mp4 — drop any clip there and
 * it works. Override via NEXT_PUBLIC_HERO_VIDEO_URL for a CDN-hosted file.
 */
const Hero = ({ countryCode }: { countryCode: string }) => {
  const videoSrc =
    process.env.NEXT_PUBLIC_HERO_VIDEO_URL || "/video/solkast-hero.mp4"
  const videoPoster = process.env.NEXT_PUBLIC_HERO_VIDEO_POSTER

  return (
    <section
      className="relative w-full h-screen min-h-[600px] overflow-hidden bg-black"
      data-testid="hero"
    >
      {/* ── Background video ─────────────────────────────────────────── */}
      <div className="absolute inset-0" aria-hidden="true">
        <video
          className="h-full w-full object-cover opacity-60"
          src={videoSrc}
          poster={videoPoster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        {/* Layered gradient overlay: radial vignette + bottom fade for text */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.7)_100%)]" />
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
        {/* Headline — sharp, futuristic, unmissable */}
        <h1
          className="
            font-header uppercase tracking-[0.25em]
            text-3xl sm:text-5xl md:text-7xl lg:text-8xl
            text-white font-bold
            leading-[1.15]
            [text-shadow:0_0_60px_rgba(255,255,255,0.08)]
          "
        >
          <span className="block">BEYOND</span>
          <span className="block text-silver-muted my-2 sm:my-3 text-xl sm:text-3xl md:text-5xl lg:text-6xl tracking-[0.5em]">
            //
          </span>
          <span className="block">THE</span>
          <span className="block text-silver-muted my-2 sm:my-3 text-xl sm:text-3xl md:text-5xl lg:text-6xl tracking-[0.5em]">
            //
          </span>
          <span className="block">HORIZON</span>
        </h1>

        {/* CTA — thin metallic border, electric blue glow on hover */}
        <LocalizedClientLink
          href="/store"
          className="
            group relative mt-10 sm:mt-14
            px-10 py-4 sm:px-14 sm:py-5
            font-mono text-xs sm:text-sm
            tracking-[0.35em] uppercase
            text-silver border border-silver-dark/50
            rounded-none
            transition-all duration-500 ease-out
            hover:border-[#00d4ff] hover:text-white
            hover:shadow-[0_0_30px_rgba(0,212,255,0.35),inset_0_0_30px_rgba(0,212,255,0.08)]
            backdrop-blur-sm
          "
          data-testid="hero-cta"
        >
          {/* Subtle inner glow line at top */}
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-silver-dark/60 to-transparent group-hover:via-[#00d4ff]/60 transition-all duration-500" />
          TRANSCEND&ensp;//&ensp;EVOLVE
          {/* Subtle inner glow line at bottom */}
          <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-silver-dark/60 to-transparent group-hover:via-[#00d4ff]/60 transition-all duration-500" />
        </LocalizedClientLink>

        {/* Scroll hint */}
        <div className="absolute bottom-8 sm:bottom-12 flex flex-col items-center gap-2 animate-pulse">
          <span className="text-silver-muted text-[10px] tracking-[0.3em] uppercase font-mono">
            Scroll
          </span>
          <svg
            width="16"
            height="24"
            viewBox="0 0 16 24"
            fill="none"
            className="text-silver-muted"
          >
            <path
              d="M8 4v12m0 0l-4-4m4 4l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}

export default Hero
