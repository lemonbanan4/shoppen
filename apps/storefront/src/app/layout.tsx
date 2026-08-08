import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { Toaster } from "sonner"
import PostHogProvider from "@modules/common/components/analytics/posthog-provider"
import "styles/globals.css"
import { BRAND, isSolkast } from "@lib/brand"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Svenskt streetwear-märke. Grafiska tröjor i ekologisk bomull, tryckta på beställning i EU. Buy now, regret later.",
  manifest: "/manifest.json",
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
