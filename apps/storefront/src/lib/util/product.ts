import { HttpTypes } from "@medusajs/types"

export const isSimpleProduct = (product: HttpTypes.StoreProduct): boolean => {
  return (
    (product.variants?.length ?? 0) <= 1 ||
    (product.options?.length === 1 && product.options[0].values?.length === 1)
  )
}