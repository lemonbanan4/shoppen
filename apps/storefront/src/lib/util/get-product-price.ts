import { HttpTypes } from "@medusajs/types"
import { getPercentageDiff } from "./get-percentage-diff"
import { convertToLocale } from "./money"

type VariantWithPrice = HttpTypes.StoreProductVariant & {
  calculated_price?: {
    calculated_amount: number
    original_amount: number
    currency_code: string
    calculated_price: {
      price_list_type: string
    }
  }
}

export const getPricesForVariant = (variant: VariantWithPrice | undefined | null) => {
  if (!variant || !variant.calculated_price) {
    return null
  }

  const calcAmount = variant.calculated_price.calculated_amount
  if (calcAmount === null || calcAmount === undefined || isNaN(Number(calcAmount))) {
    return null
  }

  const origAmount =
    variant.calculated_price.original_amount !== null &&
    variant.calculated_price.original_amount !== undefined &&
    !isNaN(Number(variant.calculated_price.original_amount))
      ? Number(variant.calculated_price.original_amount)
      : Number(calcAmount)

  const currency = variant.calculated_price.currency_code || "EUR"

  return {
    calculated_price_number: Number(calcAmount),
    calculated_price: convertToLocale({
      amount: Number(calcAmount),
      currency_code: currency,
    }),
    original_price_number: origAmount,
    original_price: convertToLocale({
      amount: origAmount,
      currency_code: currency,
    }),
    currency_code: currency,
    price_type: variant.calculated_price?.calculated_price?.price_list_type || "default",
    percentage_diff: getPercentageDiff(origAmount, Number(calcAmount)),
  }
}

export function getProductPrice({
  product,
  variantId,
}: {
  product?: HttpTypes.StoreProduct | null
  variantId?: string
}) {
  if (!product || !product.id) {
    return {
      product: product || ({} as HttpTypes.StoreProduct),
      cheapestPrice: null,
      variantPrice: null,
    }
  }

  const cheapestPrice = () => {
    if (!product || !product.variants?.length) {
      return null
    }

    const cheapestVariant = (product.variants as VariantWithPrice[])
      .filter((v) => !!v.calculated_price)
      .sort((a, b) => {
        return (
          (a.calculated_price?.calculated_amount ?? 0) -
          (b.calculated_price?.calculated_amount ?? 0)
        )
      })[0]

    return getPricesForVariant(cheapestVariant)
  }

  const variantPrice = () => {
    if (!product || !variantId) {
      return null
    }

    const variant = product.variants?.find(
      (v) => v.id === variantId || v.sku === variantId
    ) as VariantWithPrice | undefined

    if (!variant) {
      return null
    }

    return getPricesForVariant(variant)
  }

  return {
    product,
    cheapestPrice: cheapestPrice(),
    variantPrice: variantPrice(),
  }
}
