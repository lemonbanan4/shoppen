import { Metadata } from "next"
import ContentPage from "@modules/common/components/content-page"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { BRAND } from "@lib/brand"
import { SHIPPING_RATES, shippingRegionFor } from "@lib/copy"

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description: `Global delivery times, domestic fulfillment routes, and shipping rates for ${BRAND.name}.`,
}

const LAST_UPDATED = "October 2026"

export default async function ShippingPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const rates = SHIPPING_RATES[shippingRegionFor(countryCode)]

  return (
    <ContentPage
      eyebrow="CUSTOMER CARE // LOGISTICS"
      title="SHIPPING & DELIVERY"
      intro="Transparent global delivery. Every piece is crafted on demand and routed to the fulfillment facility nearest you to minimize carbon transit and delivery times."
    >
      <section>
        <h2>1. Estimated Delivery Times by Region</h2>
        <p>
          We partner with Tier-1 logistics couriers (USPS, FedEx, DHL, Royal Mail, and PostNord) to guarantee door-to-door tracked delivery.
        </p>

        <div className="overflow-x-auto my-6 not-prose">
          <table className="w-full text-xs font-mono border-collapse border border-neutral-800 bg-neutral-950/60 rounded-xl overflow-hidden">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/80 text-white">
                <th className="py-3 px-4 text-left font-semibold uppercase tracking-wider">Destination</th>
                <th className="py-3 px-4 text-left font-semibold uppercase tracking-wider">Estimated Transit</th>
                <th className="py-3 px-4 text-left font-semibold uppercase tracking-wider">Fulfillment Hub</th>
                <th className="py-3 px-4 text-left font-semibold uppercase tracking-wider">Free Shipping Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-neutral-300">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-white">United States (US)</td>
                <td className="py-3.5 px-4 text-emerald-400 font-medium">3–7 business days</td>
                <td className="py-3.5 px-4">Domestic US Facility (USPS / FedEx)</td>
                <td className="py-3.5 px-4 font-semibold text-white">Free over $85 (or $12 flat)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-white">United Kingdom (UK)</td>
                <td className="py-3.5 px-4 text-emerald-400 font-medium">3–7 business days</td>
                <td className="py-3.5 px-4">European Facility (Royal Mail / DHL)</td>
                <td className="py-3.5 px-4 font-semibold text-white">Free over €75 (approx. £65)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-white">Canada (CA)</td>
                <td className="py-3.5 px-4 text-emerald-400 font-medium">5–10 business days</td>
                <td className="py-3.5 px-4">North American Hub (Canada Post / DHL)</td>
                <td className="py-3.5 px-4 font-semibold text-white">$15 Standard / $29 Express</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-white">European Union &amp; Sweden</td>
                <td className="py-3.5 px-4 text-emerald-400 font-medium">2–5 business days</td>
                <td className="py-3.5 px-4">EU Facility (DHL / PostNord)</td>
                <td className="py-3.5 px-4 font-semibold text-white">Free over €75 / 800 SEK</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-white">Rest of the World</td>
                <td className="py-3.5 px-4 text-neutral-300 font-medium">7–14 business days</td>
                <td className="py-3.5 px-4">Nearest International Hub (DHL Express)</td>
                <td className="py-3.5 px-4 font-semibold text-white">$15 Standard / $29 Express</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>2. Sustainable Made-to-Order Production</h2>
        <p>
          To eliminate deadstock and industrial overproduction, every {BRAND.name} garment is individually printed and tailored once your order is confirmed.
        </p>
        <ul>
          <li><strong>Production Time:</strong> 2–4 business days for printing, quality control inspection, and packaging before dispatch.</li>
          <li><strong>Split Shipments:</strong> Multi-piece orders containing different garment categories (e.g., heavyweight hoodies and embroidered hats) may ship in separate parcels to ensure each piece arrives as fast as possible. You will receive individual tracking numbers for each package at no extra charge.</li>
        </ul>
      </section>

      <section>
        <h2>3. End-to-End Parcel Tracking</h2>
        <p>
          As soon as your parcel is scanned into the courier network, you will receive an automated dispatch notification with your direct tracking link.
        </p>
        <p>
          You can also track your shipment live at any time by logging into your account under{" "}
          <LocalizedClientLink href="/account/orders" className="underline font-medium hover:text-white transition-colors">
            My Account → Order History
          </LocalizedClientLink>
          .
        </p>
      </section>

      <section>
        <h2>4. Customs, Duties &amp; Taxes</h2>
        <ul>
          <li><strong>United States:</strong> Orders ship domestically from our US production partners. Zero customs fees or surprise import charges.</li>
          <li><strong>European Union:</strong> Dispatched from within the EU Single Market. VAT is fully included; no border delays or import tariffs.</li>
          <li><strong>United Kingdom &amp; Canada:</strong> Orders under standard de minimis thresholds enter duty-free. Any local carrier import fees on high-value orders are determined by local border agencies.</li>
        </ul>
      </section>

      <section>
        <h2>5. 30-Day Hassle-Free Returns &amp; Exchanges</h2>
        <p>
          If your garment doesn't fit or you wish to return it, you have <strong>30 days</strong> from the delivery date to return it in unworn condition for a full refund or size exchange.
        </p>
        <p>
          Read the complete terms and step-by-step instructions on our{" "}
          <LocalizedClientLink href="/returns" className="underline font-medium hover:text-white transition-colors">
            Returns &amp; Exchanges Policy
          </LocalizedClientLink>
          .
        </p>
      </section>

      <section>
        <h2>6. Need Support with an Existing Order?</h2>
        <p>
          If you have any questions regarding your delivery or need an address correction before dispatch, reach out immediately to our customer care team at <strong>{BRAND.email}</strong>. Please include your order confirmation number for priority assistance.
        </p>
        <p className="text-xs text-neutral-500 font-mono mt-4">
          <em>Last updated: {LAST_UPDATED}.</em>
        </p>
      </section>
    </ContentPage>
  )
}
