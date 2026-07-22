import type { MetadataRoute } from "next"

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "")
const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const STATIC_PATHS = [
  "",
  "/store",
  "/customer-service",
  "/content/shipping-and-returns",
  "/content/privacy-policy",
  "/content/terms-of-use",
]

const backendFetch = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    next: { revalidate: 3600 },
  })
  if (!res.ok) {
    throw new Error(`Sitemap fetch ${path} failed (${res.status})`)
  }
  return res.json()
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let countryCodes: string[] = [process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"]
  let productEntries: { handle: string; updated_at?: string }[] = []
  let categoryHandles: string[] = []
  let collectionHandles: string[] = []

  try {
    const { regions } = await backendFetch<{
      regions: { countries?: { iso_2?: string }[] }[]
    }>("/store/regions?fields=*countries")
    const codes = regions
      .flatMap((r) => r.countries || [])
      .map((c) => c.iso_2)
      .filter((c): c is string => Boolean(c))
    if (codes.length) countryCodes = Array.from(new Set(codes))

    const { products } = await backendFetch<{
      products: { handle: string; updated_at?: string }[]
    }>("/store/products?fields=handle,updated_at&limit=1000")
    productEntries = products

    const { product_categories } = await backendFetch<{
      product_categories: { handle: string }[]
    }>("/store/product-categories?fields=handle&limit=100")
    categoryHandles = product_categories.map((c) => c.handle)

    const { collections } = await backendFetch<{
      collections: { handle: string }[]
    }>("/store/collections?fields=handle&limit=100")
    collectionHandles = collections.map((c) => c.handle)
  } catch {
    // Backend unreachable (e.g. build without a running backend) — fall back
    // to static pages only rather than failing the whole build.
  }

  const entries: MetadataRoute.Sitemap = []
  for (const cc of countryCodes) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${BASE_URL}/${cc}${path}`,
        changeFrequency: "weekly",
        priority: path === "" ? 1 : 0.6,
      })
    }
    for (const p of productEntries) {
      entries.push({
        url: `${BASE_URL}/${cc}/products/${p.handle}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: "daily",
        priority: 0.8,
      })
    }
    for (const handle of categoryHandles) {
      entries.push({
        url: `${BASE_URL}/${cc}/categories/${handle}`,
        changeFrequency: "daily",
        priority: 0.7,
      })
    }
    for (const handle of collectionHandles) {
      entries.push({
        url: `${BASE_URL}/${cc}/collections/${handle}`,
        changeFrequency: "daily",
        priority: 0.7,
      })
    }
  }

  return entries
}
