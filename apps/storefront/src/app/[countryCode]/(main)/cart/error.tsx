"use client"

import { useEffect } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function CartError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Cart route error boundary caught:", error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 font-mono text-center">
      <div className="max-w-md w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl p-8 backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.8)]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-[11px] uppercase tracking-widest mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
          <span>Cart Stream Interrupted</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white mb-3">
          Cart Sync Error
        </h1>

        <p className="text-xs sm:text-sm text-neutral-400 mb-8 leading-relaxed">
          We couldn&apos;t retrieve all active cart items from the store session.
          You can refresh the connection or continue shopping.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 h-11 bg-white text-black hover:bg-neutral-200 font-bold text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95"
          >
            Retry Cart Sync
          </button>
          <LocalizedClientLink
            href="/store"
            className="w-full sm:w-auto px-6 h-11 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg inline-flex items-center justify-center transition-all active:scale-95"
          >
            Continue Browsing
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}
