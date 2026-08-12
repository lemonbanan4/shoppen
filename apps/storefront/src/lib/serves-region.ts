/**
 * Which backend regions this brand is allowed to sell through.
 *
 * The two shops share one Medusa backend, so they share its regions — there is
 * no per-brand region setting to switch off. Sweden has to keep existing
 * because it is Ångerköp's only market, but Solkast must not sell into it:
 * Solkast trades as a US LLC, and a sale to a Swedish consumer is an EU sale
 * that drags in Union OSS registration, a fiscal representative and quarterly
 * filings. That is the whole reason the EU was closed in the first place, and
 * leaving Sweden reachable would have left the door open.
 *
 * Deliberately plain: no imports, no server directives, no Medusa types. Both
 * callers need it and they run in different worlds — the region data layer is
 * a "use server" module in Node, the middleware runs on the Edge runtime and
 * cannot pull in either. A shared constant is the only thing both can hold.
 *
 * Matched on region name because that is what the backend exposes to the store
 * API and what a human reading this file can check against the Medusa admin.
 * Ids would be more precise and unreadable, and these names are stable.
 */

const BRAND = (process.env.NEXT_PUBLIC_BRAND || "").toLowerCase()

/** Region names a brand must not sell through, by brand id. */
const BLOCKED: Record<string, string[]> = {
  solkast: ["Sweden"],
}

const blocked = new Set(BLOCKED[BRAND] || [])

/**
 * True when this brand may sell through the region.
 *
 * Takes the name rather than the region object so the Edge middleware and the
 * server data layer can both call it without agreeing on a type.
 */
export function servesRegion(name?: string | null): boolean {
  if (!name) return true
  return !blocked.has(name)
}

/** For logging and tests — which regions this brand is refusing. */
export const blockedRegionNames = Array.from(blocked)
