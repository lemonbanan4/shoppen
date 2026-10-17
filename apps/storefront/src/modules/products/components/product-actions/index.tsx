"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import ProductPrice from "../product-price"
import BundleCallout from "../bundle-callout"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"
import posthog from "posthog-js"
import { useCopy } from "@lib/use-copy"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
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

export default function ProductActions({
  product,
  region,
  disabled,
}: ProductActionsProps) {
  const t = useCopy()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const countryCode = useParams().countryCode as string

  // Compute default pre-selected options:
  // 1. If only 1 variant exists, select all its options
  // 2. If searchParams has v_id matching a variant, select that variant's options
  // 3. For any option that only has 1 unique available value across variants (e.g. Color: "Black"),
  //    preselect it so the user only needs to pick variable options (like Size)
  useEffect(() => {
    const initialOptions: Record<string, string> = {}

    // Check URL v_id first
    const paramVariantId = searchParams.get("v_id")
    if (paramVariantId && product.variants?.length) {
      const match = product.variants.find((v) => v.id === paramVariantId)
      if (match) {
        const vOpts = optionsAsKeymap(match.options)
        if (vOpts && Object.keys(vOpts).length > 0) {
          setOptions(vOpts)
          return
        }
      }
    }

    // If only 1 variant, select its options
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
      return
    }

    // Auto-preselect single-value options (e.g. Color: "Black")
    product.options?.forEach((option) => {
      const availableValues = Array.from(
        new Set(
          (product.variants || [])
            .flatMap((v) => v.options || [])
            .filter(
              (vo) =>
                (vo.option_id || (vo as any).option?.id) === option.id
            )
            .map((vo) => vo.value)
            .filter(Boolean)
        )
      )
      if (availableValues.length === 1 && availableValues[0]) {
        initialOptions[option.id] = availableValues[0]
      }
    })

    if (Object.keys(initialOptions).length > 0) {
      setOptions((prev) => {
        return { ...initialOptions, ...prev }
      })
    }
  }, [product.options, product.variants, searchParams])

  // Selected variant resolver:
  // Matches exact options first. If user only selected variable options (e.g. Size),
  // and all candidate variants share the same single-choice values, resolves to that variant!
  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    // 1. Exact match
    const exact = product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
    if (exact) {
      return exact
    }

    // 2. Partial match fallback:
    // If user has selected some options (e.g. Size), find matching variants
    const selectedEntries = Object.entries(options).filter(([_, val]) => Boolean(val))
    if (selectedEntries.length > 0) {
      const candidates = product.variants.filter((v) => {
        const variantOptions = optionsAsKeymap(v.options)
        return selectedEntries.every(
          ([optId, val]) => variantOptions[optId] === val
        )
      })

      // If exactly 1 variant matches the selected options, use it!
      if (candidates.length === 1) {
        return candidates[0]
      }
    }

    return undefined
  }, [product.variants, options])

  // Update option value and auto-resolve any unambiguously required companion options
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => {
      const updated = {
        ...prev,
        [optionId]: value,
      }

      // If this selection uniquely identifies a variant, bring in that variant's full options map
      const selectedEntries = Object.entries(updated).filter(([_, val]) => Boolean(val))
      const matchingVariants = (product.variants || []).filter((v) => {
        const vOpts = optionsAsKeymap(v.options)
        return selectedEntries.every(
          ([id, val]) => vOpts[id] === val
        )
      })

      if (matchingVariants.length === 1) {
        const fullVariantOpts = optionsAsKeymap(matchingVariants[0].options)
        return {
          ...fullVariantOpts,
          ...updated,
        }
      }

      return updated
    })
  }

  // Check if selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return !!selectedVariant
  }, [selectedVariant])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString(), { scroll: false })
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock and has a valid price
  const inStock = useMemo(() => {
    if (!selectedVariant) return false

    // Variant must have a valid price
    const hasPrice =
      Boolean(selectedVariant.calculated_price) &&
      selectedVariant.calculated_price?.calculated_amount !== null &&
      selectedVariant.calculated_price?.calculated_amount !== undefined &&
      Number(selectedVariant.calculated_price?.calculated_amount) > 0
    if (!hasPrice) {
      return false
    }

    // If we don't manage inventory, we can always add to cart
    if (!selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if ((selectedVariant?.inventory_quantity || 0) > 0) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  useEffect(() => {
    posthog.capture("product_viewed", {
      product_id: product.id,
      product_handle: product.handle,
      product_title: product.title,
    })
  }, [product.id])

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode,
      })
      posthog.capture("add_to_cart", {
        product_id: product.id,
        product_handle: product.handle,
        product_title: product.title,
        variant_id: selectedVariant.id,
        variant_title: selectedVariant.title,
        quantity: 1,
      })
      toast.success(`${product.title} added to cart`, {
        description: selectedVariant.title,
      })
    } catch (err: any) {
      posthog.captureException(err)
      toast.error("Couldn't add this to your cart", {
        description: err?.message || "Please try again.",
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                const availableValues = Array.from(
                  new Set(
                    (product.variants || [])
                      .flatMap((v) => v.options || [])
                      .filter(
                        (vo) =>
                          (vo.option_id || (vo as any).option?.id) === option.id
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
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      availableValues={availableValues}
                      outOfStockValues={outOfStockValues}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />

        <BundleCallout product={product} region={region} />

        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||
            isAdding ||
            !isValidVariant
          }
          variant="transparent"
          className="w-full h-12 !bg-white !text-black hover:!bg-neutral-200 font-mono font-bold uppercase tracking-wider transition-all disabled:!bg-neutral-800 disabled:!text-neutral-500 rounded-lg active:scale-[0.98] shadow-[0_0_15px_rgba(255,255,255,0.15)]"
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {isAdding
            ? "ADDING TO CART..."
            : !selectedVariant || !isValidVariant
            ? t.selectSize
            : !inStock
            ? t.outOfStock
            : t.addToCart}
        </Button>
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
          region={region}
        />
      </div>
    </>
  )
}
