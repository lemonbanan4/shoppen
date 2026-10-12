import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { splitDescription } from "@lib/util/product-description"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  // Only the intro sells the piece here; the spec bullets move to the
  // details tab so the photo is not pushed off a phone screen.
  const { intro } = splitDescription(product.description)

  return (
    <div id="product-info">
      <div className="flex flex-col gap-y-4 lg:max-w-[500px] mx-auto">
        {product.collection && (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="text-xs font-mono uppercase tracking-widest text-[#00d4ff] hover:text-white transition-colors"
          >
            {product.collection.title}
          </LocalizedClientLink>
        )}
        <Heading
          level="h2"
          className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white uppercase"
          data-testid="product-title"
        >
          {product.title}
        </Heading>

        {intro && (
          <Text
            className="text-sm font-sans text-[#EDEDED] leading-relaxed whitespace-pre-line"
            data-testid="product-description"
          >
            {intro}
          </Text>
        )}
      </div>
    </div>
  )
}

export default ProductInfo
