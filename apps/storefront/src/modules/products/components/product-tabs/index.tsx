"use client"

import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"
import { splitDescription } from "@lib/util/product-description"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

type SizeGuide = {
  unit: string
  sizes: string[]
  rows: { label: string; values: Record<string, string> }[]
}

const parseSizeGuide = (
  product: HttpTypes.StoreProduct
): SizeGuide | null => {
  const raw = product.metadata?.size_guide
  if (typeof raw !== "string") return null
  try {
    const guide = JSON.parse(raw) as SizeGuide
    return guide?.rows?.length ? guide : null
  } catch {
    return null
  }
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const sizeGuide = parseSizeGuide(product)

  const tabs = [
    {
      label: "Details & fabric",
      component: <ProductInfoTab product={product} />,
    },
    ...(sizeGuide
      ? [
          {
            label: "Size Guide",
            component: <SizeGuideTab guide={sizeGuide} />,
          },
        ]
      : []),
    {
      label: "Shipping & Returns",
      component: <ShippingInfoTab />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab, i) => (
          <Accordion.Item
            key={i}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const SizeGuideTab = ({ guide }: { guide: SizeGuide }) => {
  const sizes = guide.sizes.length
    ? guide.sizes
    : Array.from(new Set(guide.rows.flatMap((r) => Object.keys(r.values))))

  return (
    <div className="py-8">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500">
              <th className="py-2 pr-4 font-medium">Measurement ({guide.unit})</th>
              {sizes.map((s) => (
                <th key={s} className="py-2 px-3 font-medium text-center">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((row) => (
              <tr key={row.label} className="border-b border-neutral-100">
                <td className="py-2 pr-4 text-neutral-700">{row.label}</td>
                {sizes.map((s) => (
                  <td key={s} className="py-2 px-3 text-center text-neutral-900">
                    {row.values[s] ?? "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-neutral-500">
        Garment measurements, taken flat. Between sizes? Size up for the
        intended oversized fit.
      </p>
    </div>
  )
}

const ProductInfoTab = ({ product }: ProductTabsProps) => {
  // The spec bullets from the supplier's catalog copy. These carry the real
  // detail — fabric, weight, fit, certifications — where Medusa's own
  // material/weight/dimension fields are unset for print-on-demand products
  // and rendered as a grid of dashes.
  const { bullets } = splitDescription(product.description)

  const attributes = [
    ["Material", product.material],
    ["Weight", product.weight ? `${product.weight} g` : null],
    ["Country of origin", product.origin_country],
    ["Type", product.type?.value],
    [
      "Dimensions",
      product.length && product.width && product.height
        ? `${product.length}L x ${product.width}W x ${product.height}H`
        : null,
    ],
  ].filter(([, value]) => Boolean(value)) as [string, string][]

  if (!bullets.length && !attributes.length) {
    return (
      <div className="text-small-regular py-8">
        <p className="text-ui-fg-subtle">
          Full details for this piece are on their way.
        </p>
      </div>
    )
  }

  return (
    <div className="text-small-regular py-8 flex flex-col gap-y-6">
      {bullets.length > 0 && (
        <ul className="flex flex-col gap-y-2">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex gap-x-2 text-ui-fg-subtle">
              <span aria-hidden="true">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
      {attributes.length > 0 && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {attributes.map(([label, value]) => (
            <div key={label}>
              <span className="font-semibold">{label}</span>
              <p>{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ShippingInfoTab = () => {
  return (
    <div className="text-small-regular py-8">
      <div className="grid grid-cols-1 gap-y-8">
        <div className="flex items-start gap-x-2">
          <FastDelivery />
          <div>
            <span className="font-semibold">Fast delivery</span>
            <p className="max-w-sm">
              Your package will arrive in 3-5 business days at your pick up
              location or in the comfort of your home.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Refresh />
          <div>
            <span className="font-semibold">Simple exchanges</span>
            <p className="max-w-sm">
              Is the fit not quite right? No worries - we&apos;ll exchange your
              product for a new one.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-2">
          <Back />
          <div>
            <span className="font-semibold">Easy returns</span>
            <p className="max-w-sm">
              Just return your product and we&apos;ll refund your money. No
              questions asked – we&apos;ll do our best to make sure your return
              is hassle-free.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
