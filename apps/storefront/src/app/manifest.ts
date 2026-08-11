import type { MetadataRoute } from "next"
import { BRAND, isSolkast } from "@lib/brand"

/**
 * The PWA manifest, per brand.
 *
 * Replaces a static public/manifest.json that named Ångerköp, described it as
 * "Independent streetwear", and pointed at Ångerköp's Å icon — so a Solkast
 * visitor who added the shop to their home screen got a competitor's name and
 * initial sitting on their phone.
 *
 * background_color follows the brand too. It paints the splash screen while
 * the app boots, and white behind Solkast's dark shop reads as a flash of
 * broken page on every launch.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    display: "standalone",
    background_color: isSolkast ? "#0a0a0a" : "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: `/brand/icon-${BRAND.id}.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  }
}
