import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import Product from "../product-preview"
import { getBundlePair, getBundleDiscountAmount } from "@lib/util/bundle"
import ErrorBoundary, {
  ProductCardErrorFallback,
} from "@modules/common/components/error-boundary"

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

export default async function RelatedProducts({
  product,
  countryCode,
}: RelatedProductsProps) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const bundlePair = getBundlePair(product.handle)
  const discountAmount = bundlePair
    ? getBundleDiscountAmount(region?.currency_code)
    : null

  // edit this function to define your related products logic
  const queryParams: HttpTypes.StoreProductListParams = {}
  if (region?.id) {
    queryParams.region_id = region.id
  }
  if (product.collection_id) {
    queryParams.collection_id = [product.collection_id]
  }
  if (product.tags) {
    queryParams.tag_id = product.tags
      .map((t) => t.id)
      .filter(Boolean) as string[]
  }
  queryParams.is_giftcard = false

  let products = await listProducts({
    queryParams,
    countryCode,
  }).then(({ response }) => {
    return response.products.filter(
      (responseProduct) => responseProduct.id !== product.id
    )
  })

  // If this product is part of a bundle, ensure the counterpart is at index 0
  if (bundlePair) {
    const counterpartIndex = products.findIndex(
      (p) => p.handle === bundlePair.counterpartHandle
    )

    if (counterpartIndex > -1) {
      const [counterpart] = products.splice(counterpartIndex, 1)
      products = [counterpart, ...products]
    } else {
      // Counterpart wasn't in collection/tags results; fetch it explicitly
      const counterpartRes = await listProducts({
        queryParams: {
          handle: bundlePair.counterpartHandle,
          region_id: region.id,
          limit: 1,
        },
        countryCode,
      }).then(({ response }) => response.products[0])

      if (counterpartRes) {
        products = [counterpartRes, ...products]
      }
    }
  }

  if (!products.length) {
    return null
  }

  return (
    <div className="product-page-constraint">
      <div className="flex flex-col mb-8">
        <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#00d4ff] mb-1.5 flex items-center gap-1.5">
          {bundlePair && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
          )}
          {bundlePair
            ? `COMPLETE THE SET // SAVE ${discountAmount}`
            : "RELATED DROPS"}
        </span>
        <h2 className="text-xl small:text-2xl font-mono font-bold text-white uppercase tracking-tight">
          {bundlePair ? "MATCHING PIECES & RELATED DROPS" : "YOU MAY ALSO LIKE"}
        </h2>
      </div>

      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-2 small:gap-3 medium:gap-4">
        {products.map((product) => (
          <li key={product.id}>
            <ErrorBoundary
              fallback={<ProductCardErrorFallback title={product.title} />}
            >
              <Product region={region} product={product} />
            </ErrorBoundary>
          </li>
        ))}
      </ul>
    </div>
  )
}
