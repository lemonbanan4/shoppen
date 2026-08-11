import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { Toaster } from "sonner"
import PostHogProvider from "@modules/common/components/analytics/posthog-provider"
import "styles/globals.css"
import { BRAND, isSolkast } from "@lib/brand"

const title = `${BRAND.name} — ${BRAND.tagline}`

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: title,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  // Both the icon and the share card used to be static files under src/app,
  // which the two deployments necessarily shared: Solkast served Ångerköp's Å
  // as its favicon, and both shops served the untouched Medusa starter card —
  // a stock desk lamp captioned "Next.js Starter Template" — as their Open
  // Graph image. That card is the most-seen asset either brand has, since it
  // is what renders in every WhatsApp, iMessage, Slack and Discord share and
  // behind every bio link.
  icons: {
    icon: `/brand/icon-${BRAND.id}.svg`,
    apple: `/brand/icon-${BRAND.id}.svg`,
  },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title,
    description: BRAND.description,
    url: `https://${BRAND.domain}`,
    images: [
      {
        url: `/brand/og-${BRAND.id}.jpg`,
        width: 1200,
        height: 630,
        alt: `${BRAND.name} — ${BRAND.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
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
        className={
          dark ? "bg-ink text-neutral-100" : "bg-white text-neutral-950"
        }
      >
        <PostHogProvider>
          <main className="relative">{props.children}</main>
          <Toaster position="bottom-right" richColors closeButton />
        </PostHogProvider>
      </body>
    </html>
  )
}
