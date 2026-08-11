/**
 * Full-bleed looping video behind the hero copy.
 *
 * Renders only when NEXT_PUBLIC_HERO_VIDEO_URL is set, so the hero falls back
 * to its current typographic treatment rather than to a black rectangle if the
 * file is missing. That matters because the homepage is the one page where a
 * broken asset costs the whole visit.
 *
 * Deliberately silent, autoplaying and loop-only:
 *
 *   muted + playsInline are the conditions every mobile browser requires for
 *   autoplay. Without both, iOS refuses to start and the poster is all anyone
 *   ever sees — which looks like a bug rather than a decision.
 *
 *   poster carries the first frame, so the layout paints immediately and the
 *   video fades in. Without it the hero is empty until enough of the file has
 *   buffered, which on a phone on mobile data is the entire first impression.
 *
 *   No controls, no audio. A shop hero that starts making noise is a reason to
 *   close the tab.
 *
 * preload="metadata" rather than "auto": the hero should not spend a visitor's
 * data downloading the whole clip before they have decided to stay.
 */
export default function HeroVideo({
  src,
  poster,
}: {
  src: string
  poster?: string
}) {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <video
        className="h-full w-full object-cover"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      {/* The copy sits on top, so the video needs holding back rather than
          showing off. A single flat scrim greys the whole frame; a gradient
          keeps the image readable where there is no text. */}
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/85 via-neutral-950/60 to-neutral-950/30" />
    </div>
  )
}
