"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"
import { META_PIXEL_ID, pageview } from "@lib/meta-pixel"

export default function MetaPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isInitialMount = useRef(true)

  useEffect(() => {
    // Skip the first execution because the <head> script already fires the initial PageView
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (META_PIXEL_ID) {
      pageview()
    }
  }, [pathname, searchParams])

  return null
}
