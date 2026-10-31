"use client"

import { useEffect, useRef } from "react"

type HeroVideoProps = {
  src: string
  poster?: string
  className?: string
}

/**
 * Bulletproof background video player engineered specifically for Safari (macOS & iOS WebKit).
 *
 * Safari Quirks Resolved:
 * 1. React WebKit Muted Bug: In React, `muted` in JSX does not consistently set the DOM property
 *    `element.muted = true` before WebKit evaluates the autoplay policy. We set `defaultMuted = true`
 *    and `muted = true` directly on the DOM element ref in an effect.
 * 2. Preload Buffering: `preload="metadata"` causes Safari to stall without buffering initial frames,
 *    preventing autoplay. `preload="auto"` ensures enough data is cached to start immediately.
 * 3. Mobile PlaysInline: Uses both `playsInline` and `webkit-playsinline="true"` to prevent iOS Safari
 *    from treating the video as needing full-screen permission.
 * 4. Explicit Source Child: Uses `<source src={src} type="video/mp4" />` so QuickTime's media pipeline
 *    identifies the codec immediately.
 * 5. Low Power Mode / Autoplay Restriction Fallback: Listens for the first passive touch/scroll/click
 *    or tab visibility change to resume playback immediately if the browser throttled it on load.
 */
export default function HeroVideo({
  src,
  poster,
  className = "h-full w-full object-cover opacity-60",
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Explicitly enforce muted properties on the raw DOM element for WebKit
    video.defaultMuted = true
    video.muted = true

    const attemptPlay = () => {
      if (!video) return
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay restricted by user agent (e.g. Low Power Mode).
          // Passive interaction listeners below will resume on first touch or scroll.
        })
      }
    }

    attemptPlay()

    // Resume immediately upon first touch, scroll, or click if Safari paused it
    const handleInteraction = () => {
      attemptPlay()
    }

    window.addEventListener("touchstart", handleInteraction, { once: true, passive: true })
    window.addEventListener("scroll", handleInteraction, { once: true, passive: true })
    window.addEventListener("click", handleInteraction, { once: true, passive: true })
    document.addEventListener("visibilitychange", attemptPlay)

    return () => {
      window.removeEventListener("touchstart", handleInteraction)
      window.removeEventListener("scroll", handleInteraction)
      window.removeEventListener("click", handleInteraction)
      document.removeEventListener("visibilitychange", attemptPlay)
    }
  }, [])

  return (
    <video
      ref={videoRef}
      className={className}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      webkit-playsinline="true"
      preload="auto"
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}
