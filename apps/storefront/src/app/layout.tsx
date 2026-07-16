import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "Shoppen — Considered goods for everyday life",
    template: "%s | Shoppen",
  },
  description:
    "Shoppen is a curated shop of apparel, accessories and home goods. Built to last, designed to be lived in.",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" style={{ colorScheme: "light" }}>
      <body className="bg-white text-neutral-950">
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
