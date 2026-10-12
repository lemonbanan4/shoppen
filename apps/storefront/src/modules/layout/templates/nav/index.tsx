import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SearchModal from "@modules/layout/components/search-modal"
import SideMenu from "@modules/layout/components/side-menu"
import { BRAND, isSolkast } from "@lib/brand"
import { copyFor } from "@lib/copy"

// A small capsule store: every link must land on a page with products on it.
// The fit categories return when the catalogue does.
//
// Solstice is the first range big enough to earn one — seven pieces sharing a
// single pattern, from a 299 bandana to a 1499 duffle. Scattered through the
// full grid they read as seven unrelated products; the whole argument for a
// monogram is that you see it repeated across things.
//
// Not a name kept in two places: the collection is created by the Solkast sync
// under this handle, so a link here can only go dead if that stops running.
const navLinksFor = (countryCode?: string) => {
  const t = copyFor(countryCode)
  return [
    { label: t.shopAll, href: "/store" },
    { label: t.solstice, href: "/collections/solstice" },
    { label: t.newArrivals, href: "/collections/new-arrivals" },
    { label: t.about, href: "/about" },
  ]
}

export default async function Nav({ countryCode }: { countryCode?: string }) {
  const t = copyFor(countryCode)
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  const regionMap: Record<string, string> = {}
  regions?.forEach((region) => {
    region.countries?.forEach((country) => {
      if (country.iso_2) {
        regionMap[country.iso_2] = region.id
      }
    })
  })

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      {/* ── Minimal Black Announcement Ticker ── */}
      <div className="bg-black/90 border-b border-neutral-900 text-silver/80 text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-center py-2 px-4 font-mono backdrop-blur-md">
        <span className="inline-flex items-center gap-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
          <span>SOLKAST // FREE WORLDWIDE SHIPPING ON ORDERS OVER $85 // 30-DAY RETURNS</span>
        </span>
      </div>

      {/* ── Frosted Glass Blurred Header ── */}
      <header className="relative h-16 mx-auto duration-200 backdrop-blur-md bg-black/60 border-b border-neutral-900">
        <nav className="content-container text-sm flex items-center justify-between w-full h-full text-silver">
          <div className="flex-1 basis-0 h-full flex items-center gap-x-6">
            <div className="h-full small:hidden flex items-center text-silver hover:text-white transition-colors">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
              />
            </div>
            <LocalizedClientLink
              href="/"
              className="flex items-center text-white text-base tracking-[0.3em] font-header font-bold uppercase hover:text-silver transition-colors"
              data-testid="nav-store-link"
            >
              SOLKAST
            </LocalizedClientLink>
            <div className="hidden small:flex items-center gap-x-8 h-full ml-8">
              {navLinksFor(countryCode).map((link) => (
                <LocalizedClientLink
                  key={link.href}
                  href={link.href}
                  className="font-mono text-xs tracking-[0.2em] uppercase text-silver hover:text-white transition-colors"
                >
                  {link.label}
                </LocalizedClientLink>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <SearchModal regionMap={regionMap} />
            <LocalizedClientLink
              className="hidden small:block font-mono text-xs tracking-[0.2em] uppercase text-silver hover:text-white transition-colors"
              href="/account"
              data-testid="nav-account-link"
            >
              {t.account}
            </LocalizedClientLink>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="flex gap-2 font-mono text-xs tracking-[0.2em] uppercase text-silver hover:text-white transition-colors"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  {t.cartWithCount(0)}
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
