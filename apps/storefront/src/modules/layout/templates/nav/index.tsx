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
import { getBundleDiscountAmount } from "@lib/util/bundle"

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
    { label: t.aeon, href: "/collections/aeon-capsule" },
    { label: t.newArrivals, href: "/categories/new-arrivals" },
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

  const currentRegion = countryCode
    ? regions?.find((r) => r.countries?.some((c) => c.iso_2 === countryCode))
    : regions?.[0]
  const bundleDiscount = getBundleDiscountAmount(currentRegion?.currency_code)

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
      <div className="bg-black/90 border-b border-neutral-900 text-silver/80 text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.25em] uppercase py-2 font-mono backdrop-blur-md overflow-hidden relative select-none">
        {/* Edge fade gradients for mobile ticker */}
        <div className="sm:hidden pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="sm:hidden pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black to-transparent z-10" />

        {/* Mobile: Seamless Running Ticker */}
        <div className="flex sm:hidden w-max animate-marquee motion-reduce:animate-none items-center hover:[animation-play-state:paused]">
          {[0, 1].map((copyIndex) => (
            <div key={copyIndex} className="flex items-center shrink-0 pr-12">
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center mr-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4ff] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00d4ff]" />
              </span>
              <span className="whitespace-nowrap">
                {BRAND.name} // BUNDLE &amp; SAVE {bundleDiscount} ON SETS // FREE WORLDWIDE SHIPPING OVER $85 // 30-DAY RETURNS
              </span>
            </div>
          ))}
        </div>

        {/* Desktop: Centered Ticker with Live Dot */}
        <div className="hidden sm:flex items-center justify-center px-4">
          <span className="inline-flex items-center gap-x-2.5">
            <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4ff] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00d4ff]" />
            </span>
            <span className="whitespace-nowrap">
              {BRAND.name} // BUNDLE &amp; SAVE {bundleDiscount} ON SETS // FREE WORLDWIDE SHIPPING OVER $85 // 30-DAY RETURNS
            </span>
          </span>
        </div>
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
