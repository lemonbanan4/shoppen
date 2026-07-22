import type { MetadataRoute } from "next"

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "")

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/checkout",
        "/*/checkout",
        "/*/account",
        "/*/account/*",
        "/*/cart",
        "/*/order/*",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
