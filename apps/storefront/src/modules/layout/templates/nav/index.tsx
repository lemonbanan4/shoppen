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
    { label: t.about, href: "/content/about" },
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
      <div className="bg-brand text-white text-[11px] tracking-[0.14em] uppercase text-center py-2 px-4">
        {t.announcement}
      </div>
      <header
        className={`relative h-16 mx-auto border-b duration-200 backdrop-blur-md ${
          isSolkast
            ? "bg-ink/95 border-ink-line"
            : "bg-white/95 border-neutral-100"
        }`}
      >
        <nav
          className={`content-container text-sm flex items-center justify-between w-full h-full ${
            isSolkast ? "text-neutral-400" : "text-neutral-500"
          }`}
        >
          <div className="flex-1 basis-0 h-full flex items-center gap-x-6">
            <div className="h-full small:hidden flex items-center">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
              />
            </div>
            <LocalizedClientLink
              href="/"
              className={`flex items-center text-lg font-semibold tracking-[0.22em] uppercase ${
                isSolkast ? "text-neutral-50" : "text-neutral-950"
              }`}
              data-testid="nav-store-link"
            >
              {BRAND.wordmark}
            </LocalizedClientLink>
            <div className="hidden small:flex items-center gap-x-6 h-full ml-6">
              {navLinksFor(countryCode).map((link) => (
                <LocalizedClientLink
                  key={link.href}
                  href={link.href}
                  className="hover:text-neutral-950 transition-colors"
                >
                  {link.label}
                </LocalizedClientLink>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <SearchModal regionMap={regionMap} />
            <LocalizedClientLink
              className="hidden small:block hover:text-neutral-950 transition-colors"
              href="/account"
              data-testid="nav-account-link"
            >
              {t.account}
            </LocalizedClientLink>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-neutral-950 flex gap-2"
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
