import * as Sentry from "@sentry/nextjs"

/**
 * Registers Sentry for server/edge runtimes — no-ops entirely if SENTRY_DSN
 * isn't set, so this is safe to leave in place before signing up for Sentry.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config")
  }
}

export const onRequestError = Sentry.captureRequestError
