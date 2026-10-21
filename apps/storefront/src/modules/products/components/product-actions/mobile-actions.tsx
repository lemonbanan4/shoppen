import { Dialog, Transition } from "@headlessui/react"
import { Button, clx } from "@modules/common/components/ui"
import React, { Fragment, useMemo } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import ChevronDown from "@modules/common/icons/chevron-down"
import X from "@modules/common/icons/x"

import { getProductPrice } from "@lib/util/get-product-price"
import OptionSelect, { cleanOptionLabel } from "./option-select"
import { HttpTypes } from "@medusajs/types"
import { isSimpleProduct } from "@lib/util/product"
import { useCopy } from "@lib/use-copy"
import { getBundlePair, getBundleDiscountAmount } from "@lib/util/bundle"

type MobileActionsProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (title: string, value: string) => void
  inStock?: boolean
  handleAddToCart: () => void
  isAdding?: boolean
  show: boolean
  optionsDisabled: boolean
  region?: HttpTypes.StoreRegion
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
): Record<string, string> => {
  return (
    variantOptions?.reduce((acc: Record<string, string>, varopt) => {
      const optId = varopt.option_id || (varopt as any).option?.id
      if (optId && varopt.value) acc[optId] = varopt.value
      return acc
    }, {}) ?? {}
  )
}

const MobileActions: React.FC<MobileActionsProps> = ({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  isAdding,
  show,
  optionsDisabled,
  region,
}) => {
  const t = useCopy()
  const { state, open, close } = useToggleState()

  const bundlePair = getBundlePair(product.handle)
  const bundleDiscount = bundlePair
    ? getBundleDiscountAmount(region?.currency_code)
    : null

  const price = getProductPrice({
    product: product,
    variantId: variant?.id,
  })

  const selectedPrice = useMemo(() => {
    if (!price) {
      return null
    }
    const { variantPrice, cheapestPrice } = price

    return variantPrice || cheapestPrice || null
  }, [price])

  const isSimple = isSimpleProduct(product)

  // Automatically dismiss the bottom sheet back to the product page
  // after a size/option is tapped once all options are satisfied
  const handleSelectOption = (optionId: string, value: string) => {
    updateOptions(optionId, value)

    const nextOptions = { ...options, [optionId]: value }
    const allOptionsSet = (product.options || []).every(
      (opt) => Boolean(nextOptions[opt.id])
    )

    if (allOptionsSet) {
      setTimeout(() => {
        close()
      }, 180)
    }
  }

  const selectedOptionsLabel = useMemo(() => {
    if (!variant) {
      return t.selectSize || t.selectVariant || t.selectOptions || "Select Size"
    }
    const values = Object.values(options)
      .map((o) => (o ? cleanOptionLabel(o) : ""))
      .filter(Boolean)
    return values.length > 0 ? values.join(" / ") : t.selectSize || "Select Size"
  }, [variant, options, t])

  return (
    <>
      <div
        className={clx("small:hidden lg:hidden inset-x-0 bottom-0 fixed z-50", {
          "pointer-events-none": !show,
        })}
      >
        <Transition
          as={Fragment}
          show={show}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="bg-neutral-950/95 backdrop-blur-md text-white flex flex-col gap-y-3 justify-center items-center text-large-regular p-4 pb-[max(1rem,env(safe-area-inset-bottom))] h-full w-full border-t border-neutral-800 font-mono shadow-2xl"
            data-testid="mobile-actions"
          >
            <div className="flex items-center gap-x-2 text-sm">
              <span data-testid="mobile-title" className="text-white truncate max-w-[150px]">
                {product.title}
              </span>
              <span className="text-neutral-500">—</span>
              {selectedPrice ? (
                <div className="flex items-baseline gap-x-2 text-white">
                  {selectedPrice.price_type === "sale" && (
                    <span className="line-through text-xs text-neutral-500">
                      {selectedPrice.original_price}
                    </span>
                  )}
                  <span
                    className={clx("font-bold", {
                      "text-[#00d4ff]": selectedPrice.price_type === "sale",
                    })}
                  >
                    {selectedPrice.calculated_price}
                  </span>
                </div>
              ) : (
                <div></div>
              )}
            </div>

            {bundlePair && (
              <div className="w-full flex items-center justify-between px-2.5 py-1 rounded bg-[#00d4ff]/10 border border-[#00d4ff]/25 text-[11px] text-[#00d4ff]">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] animate-pulse shrink-0" />
                  <span className="truncate">Pair with {bundlePair.counterpartTitle}</span>
                </span>
                <span className="font-bold text-white shrink-0 ml-2">Save {bundleDiscount}</span>
              </div>
            )}

            <div
              className={clx("grid grid-cols-2 w-full gap-x-3", {
                "!grid-cols-1": isSimple,
              })}
            >
              {!isSimple && (
                <button
                  type="button"
                  onClick={open}
                  className="w-full h-11 flex items-center justify-between px-3.5 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-800 text-white border border-neutral-800 rounded-lg font-mono text-xs uppercase transition-colors select-none focus:outline-none"
                  data-testid="mobile-actions-button"
                >
                  <span className="truncate pr-1">
                    {selectedOptionsLabel}
                  </span>
                  <ChevronDown className="shrink-0 text-neutral-400" />
                </button>
              )}
              <Button
                onClick={!variant ? open : handleAddToCart}
                disabled={Boolean(isAdding || (variant && !inStock))}
                variant="transparent"
                className="w-full h-11 !bg-white !text-black hover:!bg-neutral-200 active:scale-[0.98] font-mono font-bold uppercase tracking-wider disabled:!bg-neutral-800 disabled:!text-neutral-500 rounded-lg text-xs transition-all"
                isLoading={isAdding}
                data-testid="mobile-cart-button"
              >
                {isAdding
                  ? "Adding..."
                  : !variant
                  ? t.addToCart
                  : !inStock
                  ? t.outOfStock
                  : t.addToCart}
              </Button>
            </div>
          </div>
        </Transition>
      </div>

      <Transition appear show={state} as={Fragment}>
        <Dialog as="div" className="relative z-[75]" onClose={close}>
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

          <div className="fixed bottom-0 inset-x-0">
            <div className="flex min-h-full h-full items-center justify-center text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-6"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-6"
              >
                <Dialog.Panel
                  className="w-full h-full transform overflow-hidden text-left flex flex-col gap-y-3"
                  data-testid="mobile-actions-modal"
                >
                  <div className="w-full flex justify-end pr-6">
                    <button
                      type="button"
                      onClick={close}
                      className="bg-neutral-900 border border-neutral-800 w-11 h-11 rounded-full text-white flex justify-center items-center hover:bg-neutral-800 transition-colors shadow-lg"
                      data-testid="close-modal-button"
                    >
                      <X />
                    </button>
                  </div>
                  <div className="bg-neutral-950 text-white border-t border-neutral-800 rounded-t-2xl px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl">
                    <div className="flex items-center justify-between pb-3 mb-5 border-b border-neutral-900">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                          {t.selectSize || "Select Size"}
                        </span>
                        <h3 className="text-sm font-bold text-white truncate max-w-[220px]">
                          {product.title}
                        </h3>
                      </div>
                      {selectedPrice && (
                        <div className="text-right">
                          <span className="text-sm font-mono font-bold text-white">
                            {selectedPrice.calculated_price}
                          </span>
                        </div>
                      )}
                    </div>

                    {(product.variants?.length ?? 0) > 1 && (
                      <div className="flex flex-col gap-y-6">
                        {(product.options || []).map((option) => {
                          const availableValues = Array.from(
                            new Set(
                              (product.variants || [])
                                .flatMap((v) => v.options || [])
                                .filter(
                                  (vo) =>
                                    (vo.option_id || (vo as any).option?.id) ===
                                    option.id
                                )
                                .map((vo) => vo.value)
                                .filter(Boolean)
                            )
                          )

                          const outOfStockValues = availableValues.filter((val) => {
                            const matchingVariants = (product.variants || []).filter((v) => {
                              const vOpts = optionsAsKeymap(v.options)
                              return vOpts[option.id] === val
                            })
                            if (!matchingVariants.length) return true
                            return matchingVariants.every((v) => {
                              const hasPrice =
                                Boolean(v.calculated_price) &&
                                v.calculated_price?.calculated_amount !== null &&
                                v.calculated_price?.calculated_amount !== undefined &&
                                Number(v.calculated_price?.calculated_amount) > 0
                              const hasInventory =
                                !v.manage_inventory ||
                                Boolean(v.allow_backorder) ||
                                (v.inventory_quantity ?? 0) > 0
                              return !hasPrice || !hasInventory
                            })
                          })

                          return (
                            <div key={option.id}>
                              <OptionSelect
                                option={option}
                                current={options[option.id]}
                                updateOption={handleSelectOption}
                                title={option.title ?? ""}
                                availableValues={availableValues}
                                outOfStockValues={outOfStockValues}
                                disabled={optionsDisabled}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="pt-6 mt-6 border-t border-neutral-900">
                      <button
                        type="button"
                        onClick={() => {
                          if (variant && inStock && !isAdding) {
                            handleAddToCart()
                            close()
                          } else {
                            close()
                          }
                        }}
                        disabled={isAdding || (Boolean(variant) && !inStock)}
                        className="w-full h-11 flex items-center justify-center bg-white text-black hover:bg-neutral-200 active:scale-[0.98] font-mono font-bold text-xs uppercase tracking-wider rounded-lg transition-all disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                      >
                        {isAdding
                          ? "Adding..."
                          : !variant
                          ? (t.selectSize || "Select a Size")
                          : !inStock
                          ? (t.outOfStock || "Out of Stock")
                          : `${t.addToCart || "Add to Cart"}${selectedPrice?.calculated_price ? ` — ${selectedPrice.calculated_price}` : ""}`}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileActions
