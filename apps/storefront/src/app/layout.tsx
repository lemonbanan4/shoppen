import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { Toaster } from "sonner"
import PostHogProvider from "@modules/common/components/analytics/posthog-provider"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "Ångerköp — Köp nu. Ångra sen.",
    template: "%s | Ångerköp",
  },
  description:
    "Svenskt streetwear-märke. Grafiska tröjor i ekologisk bomull, tryckta på beställning i EU. Buy now, regret later.",
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
