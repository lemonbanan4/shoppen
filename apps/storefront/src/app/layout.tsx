import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { Toaster } from "sonner"
import PostHogProvider from "@modules/common/components/analytics/posthog-provider"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "Solkast — Independent streetwear, printed to order",
    template: "%s | Solkast",
  },
  description:
    "Original graphic tees, hoodies and caps. Small-batch streetwear designed in Sweden, printed to order in the EU and US.",
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" style={{ colorScheme: "light" }}>
      <body className="bg-white text-neutral-950">
        <PostHogProvider>
          <main className="relative">{props.children}</main>
          <Toaster position="bottom-right" richColors closeButton />
        </PostHogProvider>
      </body>
    </html>
  )
}
