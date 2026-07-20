import Script from "next/script"
import { HttpTypes } from "@medusajs/types"

const WIDGET_SCRIPT_URL = process.env.NEXT_PUBLIC_JUDGEME_WIDGET_SCRIPT_URL

/**
 * Judge.me platform-independent review widget. No-ops entirely if
 * NEXT_PUBLIC_JUDGEME_WIDGET_SCRIPT_URL isn't set.
 *
 * Setup: Judge.me admin → Settings → Advanced → "Enable platform-independent
 * widgets" → copy the generated script URL into that env var. Note: reviews
 * are matched to products by ID in Judge.me's system, so products still
 * need to exist there (via their API or CSV import) before reviews show up
 * — this component only renders the widget, it doesn't sync products.
 */
const ProductReviews = ({ product }: { product: HttpTypes.StoreProduct }) => {
  if (!WIDGET_SCRIPT_URL) return null

  return (
    <>
      <Script src={WIDGET_SCRIPT_URL} strategy="afterInteractive" />
      <div
        className="jdgm-widget jdgm-review-widget jdgm-outside-widget"
        data-id={product.handle}
        data-product-title={product.title}
      />
    </>
  )
}

export default ProductReviews
