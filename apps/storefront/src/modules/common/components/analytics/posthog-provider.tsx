"use client"

import posthog from "posthog-js"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect } from "react"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"

/**
 * Cookieless product analytics + session replay. No-ops entirely if
 * NEXT_PUBLIC_POSTHOG_KEY isn't set — safe to leave in place before signing
 * up for PostHog.
 */
export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!POSTHOG_KEY || posthog.__loaded) return

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false, // captured manually below on route change
      capture_pageleave: true,
    })
  }, [])

  return (
    <>
      {POSTHOG_KEY && (
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
      )}
      {children}
    </>
  )
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!POSTHOG_KEY || !posthog.__loaded) return

    const query = searchParams.toString()
    posthog.capture("$pageview", {
      $current_url: query ? `${pathname}?${query}` : pathname,
    })
  }, [pathname, searchParams])

  return null
}
