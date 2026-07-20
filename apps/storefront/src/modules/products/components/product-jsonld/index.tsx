import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

/**
 * schema.org Product structured data — lets Google show price/availability
 * (and eventually ratings) directly in search results instead of a bare
 * blue link.
 */
const ProductJsonLd = ({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}) => {
  const { cheapestPrice } = getProductPrice({ product })

  const anyVariantAvailable = (product.variants || []).some((v) => {
    if (!v.manage_inventory) return true
    if (v.allow_backorder) return true
    return (v.inventory_quantity || 0) > 0
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
  const url = `${baseUrl}/${region.countries?.[0]?.iso_2 || ""}/products/${product.handle}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.subtitle || product.description || undefined,
    image: (product.images || []).map((i) => i.url).filter(Boolean),
    sku: product.variants?.[0]?.sku || product.id,
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: cheapestPrice?.currency_code?.toUpperCase(),
      price: cheapestPrice?.calculated_price_number,
      availability: anyVariantAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default ProductJsonLd
