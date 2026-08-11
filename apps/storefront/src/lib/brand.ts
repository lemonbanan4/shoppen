/**
 * Which brand this deployment serves.
 *
 * One codebase runs both storefronts. They share a Medusa backend and differ
 * only by sales channel — Ångerköp on the default channel, Solkast on its
 * own — so the publishable key already decides which products are visible.
 * This decides everything a key cannot: name, voice, contact, mark.
 *
 * Forking the app instead would mean every fix landing twice, which has
 * already gone wrong once in this repo with the two reel scripts.
 *
 * Set NEXT_PUBLIC_BRAND=solkast on the Solkast deployment. Anything else
 * (including unset) is Ångerköp, so the existing deployment is unaffected.
 */

export type BrandId = "angerkop" | "solkast"

export type Brand = {
  id: BrandId
  /** Display name, as written in running text. */
  name: string
  /** Wordmark casing — Ångerköp letterspaces uppercase, Solkast does too. */
  wordmark: string
  tagline: string
  /**
   * The meta description, and the one in the JSON-LD.
   *
   * Brand-level rather than route-level because the root layout has no
   * country code to switch on. Ångerköp therefore serves Swedish metadata
   * on /dk and /de even though the UI there is English — worth knowing, but
   * far better than what this replaced, which was Solkast serving Ångerköp's
   * Swedish copy to every search engine and link preview.
   */
  description: string
  domain: string
  email: string
  /** Drives copy language on shared chrome. Solkast trades in English. */
  lang: "sv" | "en"
  /** Used in <html lang> and for Intl formatting fallbacks. */
  htmlLang: string
}

const ANGERKOP: Brand = {
  id: "angerkop",
  name: "Ångerköp",
  wordmark: "Ångerköp",
  tagline: "Köp nu. Ångra sen.",
  description:
    "Svenskt streetwear-märke. Grafiska tröjor i ekologisk bomull, tryckta " +
    "på beställning i EU. Buy now, regret later.",
  domain: "angerkop.se",
  email: "hej@angerkop.se",
  lang: "sv",
  htmlLang: "en",
}

const SOLKAST: Brand = {
  id: "solkast",
  name: "Solkast",
  wordmark: "Solkast",
  tagline: "Considered goods.",
  description:
    "Graphic pieces in heavy organic cotton, printed to order in the EU. " +
    "A short list, made properly, meant to outlast the season.",
  domain: "solkast.com",
  email: "hello@solkast.com",
  lang: "en",
  htmlLang: "en",
}

const BRANDS: Record<BrandId, Brand> = {
  angerkop: ANGERKOP,
  solkast: SOLKAST,
}

// Read once at module scope. NEXT_PUBLIC_* is inlined at build time, so each
// deployment is compiled against exactly one brand and there is no per-request
// branching to get wrong.
const configured = (process.env.NEXT_PUBLIC_BRAND || "").toLowerCase()

export const BRAND: Brand = BRANDS[configured as BrandId] ?? ANGERKOP

export const isSolkast = BRAND.id === "solkast"
export const isAngerkop = BRAND.id === "angerkop"
