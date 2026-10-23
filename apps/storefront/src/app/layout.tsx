import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { Toaster } from "sonner"
import PostHogProvider from "@modules/common/components/analytics/posthog-provider"
import { Analytics } from "@vercel/analytics/next"
import "styles/globals.css"
import { BRAND, isSolkast } from "@lib/brand"

const globalTitle = isSolkast
  ? "SOLKAST | Premium Heavyweight Streetwear"
  : `${BRAND.name} — ${BRAND.tagline}`

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: globalTitle,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  icons: {
    icon: [
      { url: "/brand/white-cyber-sigilism-logo.png", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
      { url: `/brand/icon-${BRAND.id}.svg`, type: "image/svg+xml" },
    ],
    apple: [
      { url: "/brand/white-cyber-sigilism-logo.png", type: "image/png" },
      { url: "/apple-icon.svg", type: "image/svg+xml" },
      { url: `/brand/icon-${BRAND.id}.svg`, type: "image/svg+xml" },
    ],
  },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: globalTitle,
    description: BRAND.description,
    url: `https://${BRAND.domain}`,
    images: [
      {
        url: `/brand/og-${BRAND.id}.jpg`,
        width: 1200,
        height: 630,
        alt: globalTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: globalTitle,
    description: BRAND.description,
    images: [`/brand/og-${BRAND.id}.jpg`],
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  // Solkast runs dark. The artwork is gold and halftone on black, and a white
  // shop around it reads as a gallery wall behind a poster — the shop has to
  // look like the thing it sells. data-brand carries it so component styles
  // can opt in from CSS rather than every component branching in JSX.
  const dark = isSolkast

  return (
    <html
      lang="en"
      data-brand={BRAND.id}
      data-mode={dark ? "dark" : "light"}
      style={{ colorScheme: dark ? "dark" : "light" }}
    >
      <body
        className={`font-sans antialiased ${
          dark
            ? "bg-ink text-silver selection:bg-brand/30"
            : "bg-white text-neutral-950"
        }`}
      >
        <PostHogProvider>
          <main className="relative">{props.children}</main>
          <Toaster position="bottom-right" richColors closeButton />
          <Analytics />
        </PostHogProvider>
      </body>
    </html>
  )
}
