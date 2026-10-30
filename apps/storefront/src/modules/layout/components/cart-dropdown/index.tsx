"use client"

import {
  Dialog,
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import BundleUpsell from "@modules/cart/components/bundle-upsell"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState, useOptimistic, useTransition } from "react"
import { useCopy } from "@lib/use-copy"
import { deleteLineItem } from "@lib/data/cart"
import { toast } from "sonner"
import ErrorBoundary from "@modules/common/components/error-boundary"

const CartLineItemSkeleton = () => (
  <div className="overflow-y-hidden max-h-[402px] px-4 py-3 grid grid-cols-1 gap-y-6 no-scrollbar p-px">
    {[1, 2].map((i) => (
      <div key={i} className="grid grid-cols-[122px_1fr] gap-x-4 animate-pulse">
        <div className="w-24 h-24 bg-neutral-200 rounded-md" />
        <div className="flex flex-col justify-between py-1">
          <div className="space-y-2.5">
            <div className="h-4 bg-neutral-200 rounded w-3/4" />
            <div className="h-3 bg-neutral-200 rounded w-1/2" />
            <div className="h-3 bg-neutral-200 rounded w-1/3" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="h-3 bg-neutral-200 rounded w-16" />
            <div className="h-4 bg-neutral-200 rounded w-12" />
          </div>
        </div>
      </div>
    ))}
    <div className="p-4 border-t border-gray-100 flex flex-col gap-y-3">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-neutral-200 rounded w-20 animate-pulse" />
        <div className="h-4 bg-neutral-200 rounded w-16 animate-pulse" />
      </div>
      <div className="h-10 bg-neutral-200 rounded w-full animate-pulse" />
    </div>
  </div>
)

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const t = useCopy()
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [optimisticItems, setOptimisticItems] = useOptimistic(
    cartState?.items || [],
    (state, lineId: string) => state.filter((item) => item.id !== lineId)
  )

  const handleDeleteItem = (lineId: string) => {
    startTransition(async () => {
      setOptimisticItems(lineId)
      try {
        await deleteLineItem(lineId)
      } catch (err: any) {
        toast.error("Failed to remove item", {
          description: err?.message || "Please try again.",
        })
      }
    })
  }

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const currencyCode = cartState?.currency_code || "eur"

  const totalItems =
    optimisticItems.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = optimisticItems.reduce((acc, item) => {
    return (
      acc +
      Number(
        item.total ??
          item.subtotal ??
          Number(item.unit_price ?? 0) * item.quantity
      )
    )
  }, 0)
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    open()
  }

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  // Open cart dropdown when items are added to the cart, but not on the cart page
  useEffect(() => {
    if (totalItems > itemRef.current && !pathname.includes("/cart")) {
      timedOpen()
    }
    itemRef.current = totalItems
  }, [totalItems, pathname])

  useEffect(() => {
    const handleOpenDrawer = () => {
      timedOpen()
    }
    const handleLoadingStart = () => {
      setIsLoadingItems(true)
      openAndCancel()
    }
    const handleLoadingEnd = () => {
      setIsLoadingItems(false)
    }

    window.addEventListener("open-cart-drawer", handleOpenDrawer)
    window.addEventListener("cart-loading-start", handleLoadingStart)
    window.addEventListener("cart-loading-end", handleLoadingEnd)

    return () => {
      window.removeEventListener("open-cart-drawer", handleOpenDrawer)
      window.removeEventListener("cart-loading-start", handleLoadingStart)
      window.removeEventListener("cart-loading-end", handleLoadingEnd)
    }
  }, [])

  const isCartLoading =
    isLoadingItems ||
    isPending ||
    cartState === undefined ||
    (cartState === null && totalItems > 0)

  return (
    <div
      className="h-full z-50"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative h-full">
        <PopoverButton className="h-full">
          <LocalizedClientLink
            className="font-mono text-xs tracking-[0.2em] uppercase text-silver hover:text-white transition-colors"
            href="/cart"
            data-testid="nav-cart-link"
          >{t.cartWithCount(totalItems)}</LocalizedClientLink>
        </PopoverButton>
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <PopoverPanel
            static
            className="hidden small:block absolute top-[calc(100%+1px)] right-0 bg-white text-neutral-950 border-x border-b border-gray-200 w-[420px]"
            data-testid="nav-cart-dropdown"
          >
            <div className="p-4 flex items-center justify-center">
              <h3 className="text-large-semi">Cart</h3>
            </div>
            {isCartLoading ? (
              <CartLineItemSkeleton />
            ) : optimisticItems && optimisticItems.length ? (
              <>
                <div className="overflow-y-scroll max-h-[402px] px-4 grid grid-cols-1 gap-y-8 no-scrollbar p-px">
                  {optimisticItems
                    .sort((a, b) => {
                      return (a.created_at ?? "") > (b.created_at ?? "")
                        ? -1
                        : 1
                    })
                    .map((item) => (
                      <ErrorBoundary
                        key={item.id}
                        fallback={
                          <div className="flex items-center justify-between p-2 text-xs text-neutral-400 font-mono border-b border-neutral-900">
                            <span className="truncate max-w-[160px]">
                              {item.product_title || item.title || "Item Data Sync Error"}
                            </span>
                            <DeleteButton
                              id={item.id}
                              onDelete={handleDeleteItem}
                            >
                              Remove
                            </DeleteButton>
                          </div>
                        }
                      >
                        <div
                          className="grid grid-cols-[122px_1fr] gap-x-4"
                          data-testid="cart-item"
                        >
                          <LocalizedClientLink
                            href={`/products/${item.product_handle}`}
                            className="w-24"
                          >
                            <Thumbnail
                              thumbnail={item.thumbnail}
                              images={item.variant?.product?.images}
                              alt={item.product_title || item.title}
                              size="square"
                            />
                          </LocalizedClientLink>
                          <div className="flex flex-col justify-between flex-1">
                            <div className="flex flex-col flex-1">
                              <div className="flex items-start justify-between">
                                <div className="flex flex-col overflow-ellipsis whitespace-nowrap mr-4 w-[180px]">
                                  <h3 className="text-base-regular overflow-hidden text-ellipsis">
                                    <LocalizedClientLink
                                      href={`/products/${item.product_handle}`}
                                      data-testid="product-link"
                                    >
                                      {item.title}
                                    </LocalizedClientLink>
                                  </h3>
                                  <LineItemOptions
                                    variant={item.variant}
                                    data-testid="cart-item-variant"
                                    data-value={item.variant}
                                  />
                                  <span
                                    data-testid="cart-item-quantity"
                                    data-value={item.quantity}
                                  >
                                    {t.cartQuantity}: {item.quantity}
                                  </span>
                                  {item.adjustments && item.adjustments.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {item.adjustments.map((adjustment) => {
                                        const isBundle =
                                          adjustment.code?.includes("AEON-BUNDLE") ||
                                          adjustment.code?.includes("BUNDLE")
                                        return (
                                          <span
                                            key={adjustment.id}
                                            className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-[#00d4ff] bg-[#00d4ff]/10 border border-[#00d4ff]/25 px-1.5 py-0.5 rounded"
                                          >
                                            <span className="h-1 w-1 rounded-full bg-[#00d4ff]" />
                                            {isBundle ? "Bundle" : adjustment.code || "Discount"}{" "}
                                            (-{convertToLocale({
                                              amount: adjustment.amount,
                                              currency_code: currencyCode,
                                            })})
                                          </span>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                                <div className="flex justify-end">
                                  <LineItemPrice
                                    item={item}
                                    style="tight"
                                    currencyCode={currencyCode}
                                  />
                                </div>
                              </div>
                            </div>
                            <DeleteButton
                              id={item.id}
                              className="mt-1"
                              data-testid="cart-item-remove-button"
                              onDelete={handleDeleteItem}
                            >
                              Remove
                            </DeleteButton>
                          </div>
                        </div>
                      </ErrorBoundary>
                    ))}
                </div>
                <div className="p-4 flex flex-col gap-y-4 text-small-regular">
                  <BundleUpsell cart={cartState} />
                  <div className="flex items-center justify-between">
                    <span className="text-ui-fg-base font-semibold">
                      {t.cartSubtotal}{" "}
                      <span className="font-normal">{t.cartExcludingTaxes}</span>
                    </span>
                    <span
                      className="text-large-semi"
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                    >
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: currencyCode,
                      })}
                    </span>
                  </div>
                  <LocalizedClientLink href="/cart" passHref>
                    <Button
                      className="w-full"
                      size="large"
                      data-testid="go-to-cart-button"
                    >
                      {t.cartGoTo}
                    </Button>
                  </LocalizedClientLink>
                  <div className="flex items-center justify-center gap-x-2 text-[10px] text-neutral-500 font-mono">
                    <span>✓ Tracked Delivery</span>
                    <span>·</span>
                    <span>✓ 30-Day Returns</span>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="flex py-16 flex-col gap-y-4 items-center justify-center">
                  <div className="bg-gray-900 text-small-regular flex items-center justify-center w-6 h-6 rounded-full text-white">
                    <span>0</span>
                  </div>
                  <span>{t.cartEmpty}</span>
                  <div>
                    <LocalizedClientLink href="/store">
                      <>
                        <span className="sr-only">{t.cartExploreAria}</span>
                        <Button onClick={close}>{t.cartExplore}</Button>
                      </>
                    </LocalizedClientLink>
                  </div>
                </div>
              </div>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>

      {/* Mobile Slide-Out Cart Drawer */}
      <Transition appear show={cartDropdownOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100] small:hidden" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-out duration-300"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className="w-screen max-w-[360px] bg-white text-neutral-950 flex flex-col justify-between shadow-2xl h-full font-sans">
                <div className="p-4 flex items-center justify-between border-b border-gray-100">
                  <h3 className="text-large-semi font-header uppercase tracking-wider">Cart</h3>
                  <button
                    onClick={close}
                    className="p-2 text-neutral-500 hover:text-black font-mono text-sm"
                    aria-label="Close cart"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {isCartLoading ? (
                    <CartLineItemSkeleton />
                  ) : optimisticItems && optimisticItems.length ? (
                    <div className="px-4 py-4 grid grid-cols-1 gap-y-6">
                      {optimisticItems
                        .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))
                        .map((item) => (
                          <div key={item.id} className="grid grid-cols-[80px_1fr] gap-x-3 text-xs">
                            <Thumbnail
                              thumbnail={item.thumbnail}
                              images={item.variant?.product?.images}
                              alt={item.product_title || item.title}
                              size="square"
                            />
                            <div className="flex flex-col justify-between">
                              <div>
                                <p className="font-bold truncate">{item.title}</p>
                                <LineItemOptions variant={item.variant} />
                                <p className="text-neutral-500 font-mono mt-0.5">Qty: {item.quantity}</p>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
                                <DeleteButton id={item.id} onDelete={handleDeleteItem}>
                                  Remove
                                </DeleteButton>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex py-16 flex-col gap-y-4 items-center justify-center">
                      <div className="bg-gray-900 text-small-regular flex items-center justify-center w-6 h-6 rounded-full text-white">
                        <span>0</span>
                      </div>
                      <span>{t.cartEmpty}</span>
                      <LocalizedClientLink href="/store">
                        <Button onClick={close}>{t.cartExplore}</Button>
                      </LocalizedClientLink>
                    </div>
                  )}
                </div>

                {optimisticItems && optimisticItems.length > 0 && !isCartLoading && (
                  <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-100 flex flex-col gap-y-3 bg-neutral-50">
                    <BundleUpsell cart={cartState} />
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{t.cartSubtotal}</span>
                      <span>{convertToLocale({ amount: subtotal, currency_code: currencyCode })}</span>
                    </div>
                    <LocalizedClientLink href="/cart" passHref onClick={close}>
                      <Button className="w-full" size="large">
                        {t.cartGoTo}
                      </Button>
                    </LocalizedClientLink>
                    <div className="flex items-center justify-center gap-x-2 text-[10px] text-neutral-500 font-mono">
                      <span>✓ Tracked Delivery</span>
                      <span>·</span>
                      <span>✓ 30-Day Returns</span>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}

export default CartDropdown
