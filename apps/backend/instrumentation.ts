// Medusa calls register() once at boot, before the server starts — the
// right place to initialize error monitoring. No-ops entirely if SENTRY_DSN
// isn't set, so this is safe to leave in place before signing up for Sentry.
//
// For deeper request/workflow tracing via OpenTelemetry instead of (or in
// addition to) Sentry, see:
// https://docs.medusajs.com/learn/debugging-and-testing/instrumentation

export function register() {
  if (!process.env.SENTRY_DSN) return

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Sentry = require("@sentry/node")
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  })
}
