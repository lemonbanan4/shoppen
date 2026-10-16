"use client"

import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"
import { splitDescription } from "@lib/util/product-description"
import { useCopy } from "@lib/use-copy"
import { getBundlePair } from "@lib/util/bundle"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

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
  const t = useCopy()
  const sizeGuide = parseSizeGuide(product)
  const bundlePair = getBundlePair(product.handle)

  const tabs = [
    {
      label: t.tabDetails,
      component: <ProductInfoTab product={product} />,
    },
    ...(bundlePair
      ? [
          {
            label: "BUNDLE & MATCHING SET",
            component: <BundleSetTab bundlePair={bundlePair} />,
          },
        ]
      : []),
    ...(sizeGuide
      ? [
          {
            label: t.tabSizeGuide,
            component: <SizeGuideTab guide={sizeGuide} />,
          },
        ]
      : []),
    {
      label: t.tabShipping,
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
  const t = useCopy()
  const sizes = guide.sizes.length
    ? guide.sizes
    : Array.from(new Set(guide.rows.flatMap((r) => Object.keys(r.values))))

  return (
    <div className="py-6 font-mono">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 text-white">
              <th className="py-2.5 pr-4 font-semibold text-white tracking-wider uppercase">
                {t.measurement(guide.unit)}
              </th>
              {sizes.map((s) => (
                <th key={s} className="py-2.5 px-3 font-semibold text-center text-white">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((row) => (
              <tr key={row.label} className="border-b border-neutral-900/80">
                <td className="py-2.5 pr-4 text-[#EDEDED] font-medium">{row.label}</td>
                {sizes.map((s) => (
                  <td key={s} className="py-2.5 px-3 text-center text-[#EDEDED]">
                    {row.values[s] ?? "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-[#EDEDED]/70 leading-relaxed">
        {t.sizeGuideNote}
      </p>
    </div>
  )
}

const ProductInfoTab = ({ product }: ProductTabsProps) => {
  const t = useCopy()
  const { bullets } = splitDescription(product.description)

  const attributes = [
    [t.attrMaterial, product.material],
    [t.attrWeight, product.weight ? `${product.weight} g` : null],
    [t.attrOrigin, product.origin_country],
    [t.attrType, product.type?.value],
    [
      t.attrDimensions,
      product.length && product.width && product.height
        ? `${product.length}L x ${product.width}W x ${product.height}H`
        : null,
    ],
  ].filter(([, value]) => Boolean(value)) as [string, string][]

  if (!bullets.length && !attributes.length) {
    return (
      <div className="text-small-regular py-6 font-mono text-[#EDEDED]/70">
        <p>{t.detailsPending}</p>
      </div>
    )
  }

  return (
    <div className="text-small-regular py-6 flex flex-col gap-y-6 font-mono">
      {bullets.length > 0 && (
        <ul className="flex flex-col gap-y-2">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex gap-x-2 text-[#EDEDED]">
              <span aria-hidden="true" className="text-[#00d4ff]">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
      {attributes.length > 0 && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {attributes.map(([label, value]) => (
            <div key={label}>
              <span className="font-semibold text-white uppercase tracking-wider text-xs block mb-0.5">
                {label}
              </span>
              <p className="text-[#EDEDED]">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ShippingInfoTab = () => {
  const t = useCopy()
  return (
    <div className="text-small-regular py-6 font-mono">
      <div className="grid grid-cols-1 gap-y-6">
        <div className="flex items-start gap-x-3 text-white">
          <FastDelivery />
          <div>
            <span className="font-semibold text-white block">{t.shipFastTitle}</span>
            <p className="max-w-sm text-[#EDEDED]/80 text-xs mt-0.5 font-sans leading-relaxed">
              {t.shipFastBody}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-3 text-white">
          <Refresh />
          <div>
            <span className="font-semibold text-white block">{t.shipExchangeTitle}</span>
            <p className="max-w-sm text-[#EDEDED]/80 text-xs mt-0.5 font-sans leading-relaxed">
              {t.shipExchangeBody}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-x-3 text-white">
          <Back />
          <div>
            <span className="font-semibold text-white block">{t.shipReturnTitle}</span>
            <p className="max-w-sm text-[#EDEDED]/80 text-xs mt-0.5 font-sans leading-relaxed">
              {t.shipReturnBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const BundleSetTab = ({
  bundlePair,
}: {
  bundlePair: {
    title: string
    counterpartTitle: string
    counterpartHandle: string
  }
}) => {
  return (
    <div className="text-small-regular py-6 font-mono text-neutral-300 flex flex-col gap-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4ff] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d4ff]" />
        </span>
        <span className="text-xs uppercase tracking-widest text-[#00d4ff] font-bold">
          Beyond the Horizon Coordinate Set
        </span>
      </div>

      <p className="leading-relaxed text-xs sm:text-sm">
        Engineered as a complementary two-piece capsule. When you purchase the{" "}
        <strong className="text-white">{bundlePair.title}</strong> together with the matching{" "}
        <LocalizedClientLink
          href={`/products/${bundlePair.counterpartHandle}`}
          className="text-white underline underline-offset-2 decoration-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors font-bold"
        >
          {bundlePair.counterpartTitle}
        </LocalizedClientLink>
        , a set discount is automatically applied to your cart at checkout.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
        <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/60">
          <span className="text-white font-bold block mb-1 uppercase tracking-wider">
            MIX &amp; MATCH SIZING
          </span>
          <p className="text-neutral-400">
            Select different sizes for the hoodie and sweatpants. The bundle discount applies regardless of size combinations.
          </p>
        </div>
        <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/60">
          <span className="text-white font-bold block mb-1 uppercase tracking-wider">
            NO CODE REQUIRED
          </span>
          <p className="text-neutral-400">
            Discount calculates automatically at checkout once both qualifying items are in your cart.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
