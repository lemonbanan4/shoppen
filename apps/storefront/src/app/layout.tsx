import { Suspense } from "react"
import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { Toaster } from "sonner"
import PostHogProvider from "@modules/common/components/analytics/posthog-provider"
import MetaPixel from "@modules/common/components/analytics/meta-pixel"
import { META_PIXEL_ID } from "@lib/meta-pixel"
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
  verification: {
    other: {
      "facebook-domain-verification": "ioreuball9isuufxsa853cdv019oh4",
    },
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
      <head>
        {META_PIXEL_ID ? (
          <script
            id="meta-pixel-base"
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`,
            }}
          />
        ) : null}
      </head>
      <body
        className={`font-sans antialiased ${
          dark
            ? "bg-ink text-silver selection:bg-brand/30"
            : "bg-white text-neutral-950"
        }`}
      >
        {META_PIXEL_ID && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
        <PostHogProvider>
          <main className="relative">{props.children}</main>
          <Toaster position="bottom-right" richColors closeButton />
          <Analytics />
          <Suspense fallback={null}>
            <MetaPixel />
          </Suspense>
        </PostHogProvider>
      </body>
    </html>
  )
}
