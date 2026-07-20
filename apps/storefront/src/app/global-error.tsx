"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="bg-white text-neutral-950">
        <div className="flex flex-col gap-4 items-center justify-center min-h-screen text-center px-6">
          <h1 className="text-2xl font-medium">Something went wrong</h1>
          <p className="text-sm text-neutral-500 max-w-sm">
            We've been notified and are looking into it. Try refreshing the
            page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-neutral-950 text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-neutral-800 transition-colors"
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  )
}
