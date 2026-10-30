import { listCategories } from "@lib/data/categories";
import { listCollections } from "@lib/data/collections";

import LocalizedClientLink from "@modules/common/components/localized-client-link";
import LogoMark from "@modules/common/icons/logo-mark";
import NewsletterForm from "./newsletter-form";
import { BRAND } from "@lib/brand"
import { copyFor } from "@lib/copy"
import { PaymentMethodBadges } from "@modules/common/components/payment-badges"

export default async function Footer({
  countryCode,
}: {
  countryCode?: string;
}) {
  const t = copyFor(countryCode);
  const { collections } = await listCollections({
    fields: "id, handle, title",
  });
  const productCategories = await listCategories();

  return (
    <footer className="bg-black text-neutral-400 w-full mt-24 border-t border-neutral-900">
      <div className="content-container flex flex-col w-full">
        {/* Main Footer Content */}
        <div className="flex flex-col gap-y-12 lg:flex-row items-start justify-between py-16 sm:py-20 gap-x-12">
          {/* Brand & Newsletter Column */}
          <div className="max-w-sm w-full">
            <LocalizedClientLink
              href="/"
              className="flex items-center gap-x-2.5 text-base font-semibold tracking-[0.25em] text-white uppercase"
            >
              <LogoMark size="22" />
              <span>{BRAND.wordmark}</span>
            </LocalizedClientLink>
            <p className="mt-3.5 text-xs text-neutral-400 leading-relaxed font-sans max-w-xs">
              {t.footerBlurb}
            </p>
            <div className="mt-7">
              <NewsletterForm />
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 text-xs w-full lg:w-auto">
            {/* Shop Column */}
            <div className="flex flex-col gap-y-3">
              <span className="text-[11px] font-mono tracking-[0.2em] text-white uppercase font-semibold">
                {t.footerShop}
              </span>
              <ul className="flex flex-col gap-y-2.5" data-testid="footer-categories">
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors duration-150"
                    href="/store"
                  >
                    {t.allProducts}
                  </LocalizedClientLink>
                </li>
                {productCategories
                  ?.filter((c) => !c.parent_category)
                  .slice(0, 5)
                  .map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-white transition-colors duration-150"
                        href={`/categories/${c.handle}`}
                        data-testid="category-link"
                      >
                        {c.name}
                      </LocalizedClientLink>
                    </li>
                  ))}
                {collections
                  ?.filter(
                    (c) =>
                      c.handle !== "new-arrivals" && c.handle !== "bestsellers"
                  )
                  .slice(0, 3)
                  .map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-white transition-colors duration-150"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
              </ul>
            </div>

            {/* Brand Column */}
            <div className="flex flex-col gap-y-3">
              <span className="text-[11px] font-mono tracking-[0.2em] text-white uppercase font-semibold">
                Brand
              </span>
              <ul className="flex flex-col gap-y-2.5">
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors duration-150"
                    href="/about"
                  >
                    About {BRAND.name}
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors duration-150"
                    href="/customer-service"
                  >
                    Customer Care
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors duration-150"
                    href="/shipping"
                  >
                    Shipping &amp; Delivery
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>

            {/* Account Column */}
            <div className="flex flex-col gap-y-3">
              <span className="text-[11px] font-mono tracking-[0.2em] text-white uppercase font-semibold">
                Account
              </span>
              <ul className="flex flex-col gap-y-2.5">
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors duration-150"
                    href="/account"
                  >
                    {t.myAccount}
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors duration-150"
                    href="/account/orders"
                  >
                    {t.orderHistory}
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="flex flex-col gap-y-3">
              <span className="text-[11px] font-mono tracking-[0.2em] text-white uppercase font-semibold">
                Legal &amp; Policy
              </span>
              <ul className="flex flex-col gap-y-2.5">
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors duration-150"
                    href="/shipping"
                  >
                    Shipping Policy
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors duration-150"
                    href="/returns"
                  >
                    Returns &amp; Exchanges
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors duration-150"
                    href="/terms-of-service"
                  >
                    Terms of Service
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors duration-150"
                    href="/privacy-policy"
                  >
                    Privacy Policy
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sub-Footer Bar */}
        <div className="flex flex-col sm:flex-row w-full py-8 justify-between items-center border-t border-neutral-900 text-[11px] text-neutral-500 gap-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-y-2 sm:gap-x-6">
            <p>© {new Date().getFullYear()} {BRAND.name}. {t.rightsReserved}</p>
            {/* Quick Clean Minimal Legal & About Links */}
            <nav className="flex items-center gap-x-4 text-neutral-400">
              <LocalizedClientLink href="/shipping" className="hover:text-white transition-colors duration-150">
                Shipping
              </LocalizedClientLink>
              <span className="text-neutral-700">·</span>
              <LocalizedClientLink href="/returns" className="hover:text-white transition-colors duration-150">
                Returns
              </LocalizedClientLink>
              <span className="text-neutral-700">·</span>
              <LocalizedClientLink href="/terms-of-service" className="hover:text-white transition-colors duration-150">
                Terms
              </LocalizedClientLink>
              <span className="text-neutral-700">·</span>
              <LocalizedClientLink href="/privacy-policy" className="hover:text-white transition-colors duration-150">
                Privacy
              </LocalizedClientLink>
              <span className="text-neutral-700">·</span>
              <LocalizedClientLink href="/about" className="hover:text-white transition-colors duration-150">
                About
              </LocalizedClientLink>
            </nav>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            <p className="text-[11px] text-neutral-400 font-mono">{t.shippingNote}</p>
            <div className="flex items-center">
              <PaymentMethodBadges size="small" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

