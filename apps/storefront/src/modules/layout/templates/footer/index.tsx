import { listCategories } from "@lib/data/categories";
import { listCollections } from "@lib/data/collections";

import LocalizedClientLink from "@modules/common/components/localized-client-link";
import LogoMark from "@modules/common/icons/logo-mark";
import NewsletterForm from "./newsletter-form";

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "id, handle, title",
  });
  const productCategories = await listCategories();

  return (
    <footer className="bg-neutral-950 text-neutral-400 w-full mt-16">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-12 small:flex-row items-start justify-between py-16 small:py-24">
          <div className="max-w-sm">
            <LocalizedClientLink
              href="/"
              className="flex items-center gap-x-2 text-lg font-semibold tracking-[0.22em] text-white uppercase"
            >
              <LogoMark size="18" />
              Ångerköp
            </LocalizedClientLink>
            <p className="mt-4 text-sm leading-6">
              Svenskt streetwear-märke för dig som redan vet hur det slutar.
              Ekologisk bomull, tryckt på beställning i EU. Buy now, regret later.
            </p>
            <div className="mt-8">
              <NewsletterForm />
            </div>
          </div>
          <div className="text-sm gap-10 md:gap-x-20 grid grid-cols-2 sm:grid-cols-3">
            {productCategories && productCategories.length > 0 && (
              <div className="flex flex-col gap-y-3">
                <span className="text-white font-medium">Shop</span>
                <ul className="grid grid-cols-1 gap-2" data-testid="footer-categories">
                  <li>
                    <LocalizedClientLink
                      className="hover:text-white transition-colors"
                      href="/store"
                    >
                      All products
                    </LocalizedClientLink>
                  </li>
                  {productCategories.slice(0, 6).map((c) => {
                    if (c.parent_category) {
                      return null;
                    }
                    return (
                      <li key={c.id}>
                        <LocalizedClientLink
                          className="hover:text-white transition-colors"
                          href={`/categories/${c.handle}`}
                          data-testid="category-link"
                        >
                          {c.name}
                        </LocalizedClientLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-3">
                <span className="text-white font-medium">Collections</span>
                <ul className="grid grid-cols-1 gap-2">
                  {collections.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-white transition-colors"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-y-3">
              <span className="text-white font-medium">Customer care</span>
              <ul className="grid grid-cols-1 gap-y-2">
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors"
                    href="/account"
                  >
                    My account
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors"
                    href="/account/orders"
                  >
                    Order history
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors"
                    href="/content/about"
                  >
                    About Ångerköp
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors"
                    href="/customer-service"
                  >
                    Customer service
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors"
                    href="/content/shipping-and-returns"
                  >
                    Shipping &amp; returns
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors"
                    href="/content/privacy-policy"
                  >
                    Privacy policy
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    className="hover:text-white transition-colors"
                    href="/content/terms-of-use"
                  >
                    Terms of use
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex w-full py-8 justify-between items-center border-t border-neutral-800 text-xs">
          <p>© {new Date().getFullYear()} Ångerköp. All rights reserved.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <p>Fri frakt över 800 kr · 30 dagars retur · Free EU shipping over €75</p>
            <ul
              aria-label="Accepted payment methods"
              className="flex items-center gap-1.5"
            >
              {["Visa", "Mastercard", "Amex", "Apple Pay", "Klarna"].map(
                (method) => (
                  <li
                    key={method}
                    className="rounded border border-white/20 px-2 py-0.5 text-[10px] tracking-wide text-white/60"
                  >
                    {method}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
