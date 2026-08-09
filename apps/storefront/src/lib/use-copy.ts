"use client"

import { useParams } from "next/navigation"
import { copyFor, type UiCopy } from "./copy"

/**
 * Client-side counterpart to copyFor().
 *
 * Client components sit below the route segment that owns countryCode, so
 * threading it down as a prop would mean touching every intermediate
 * component. LocalizedClientLink already reads it straight off the route for
 * the same reason; this follows that precedent.
 */
export function useCopy(): UiCopy {
  const { countryCode } = useParams()
  return copyFor(typeof countryCode === "string" ? countryCode : undefined)
}
