import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import LogoMark from "@modules/common/icons/logo-mark"
import CartButton from "@modules/layout/components/cart-button"
import SearchModal from "@modules/layout/components/search-modal"
import SideMenu from "@modules/layout/components/side-menu"

const NAV_LINKS = [
  { label: "Shop all", href: "/store" },
  { label: "New arrivals", href: "/collections/new-arrivals" },
  { label: "Bestsellers", href: "/collections/bestsellers" },
]

export default async function Nav() {
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
        Free shipping on orders over €75 — easy 30-day returns
      </div>
      <header className="relative h-16 mx-auto border-b duration-200 bg-white/95 backdrop-blur-md border-neutral-100">
        <nav className="content-container text-sm text-neutral-500 flex items-center justify-between w-full h-full">
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
              className="flex items-center gap-x-2 text-lg font-semibold tracking-[0.22em] text-neutral-950 uppercase"
              data-testid="nav-store-link"
            >
              <LogoMark size="18" />
              Solkast
            </LocalizedClientLink>
            <div className="hidden small:flex items-center gap-x-6 h-full ml-6">
              {NAV_LINKS.map((link) => (
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
              Account
            </LocalizedClientLink>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-neutral-950 flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
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
