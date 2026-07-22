# Shoppen — Integration go-live guide

Everything below is already wired in code. Each integration switches itself on
the moment its environment variable exists — no code changes needed.

All env vars go in `apps/backend/.env` (see `.env.template` for the full list).
After editing `.env`, restart the backend (`npm run backend:dev` from the repo
root, or let the watcher restart).

---

## 1. Printify (print-on-demand products + fulfillment)

**In Printify** (choose "TikTok" or any channel during onboarding — it doesn't
matter for this integration):

1. Go to **My Profile → Connections → API tokens** and generate a token.
2. Optional: note your shop ID from the URL when viewing your shop
   (otherwise the first shop on the account is used).

**In this repo:**

```bash
# apps/backend/.env
PRINTIFY_API_TOKEN=eyJ...
PRINTIFY_SHOP_ID=            # optional
PRINTIFY_AUTO_PRODUCTION=false
```

Then pull your Printify catalog into the store:

```bash
cd apps/backend
npx medusa exec ./src/scripts/sync-printify-products.ts
```

What you get:

- Every Printify product appears in the store under the **Print on Demand**
  category — title, description, mockup images, size/color options, and your
  Printify retail price. Set `PRINTIFY_PRICE_CURRENCY` to whatever currency
  you enter in Printify's "Edit price" (default `usd`) — the sync converts to
  every other store currency at the live market rate and rounds to a `.99`
  charm price (`PRINTIFY_PSYCHOLOGICAL_ROUNDING=false` to keep exact
  converted amounts instead). To set a product's price by a specific target
  in a specific currency (e.g. "make this show €37"), use
  `PRINTIFY_PRODUCT_ID=... PRINTIFY_TARGET_PRICE=37 PRINTIFY_TARGET_CURRENCY=eur npx medusa exec ./src/scripts/set-printify-price.ts`
  instead of hand-converting.
- **Paid orders containing Printify items are submitted to Printify
  automatically** (as review drafts). Set `PRINTIFY_AUTO_PRODUCTION=true` to
  skip review and send straight to production. The Printify order ID is saved
  on the Medusa order for support lookups.
- Re-run the sync script any time you add/change products in Printify.

## 2. Printful (print-on-demand — embroidery pieces)

Runs alongside Printify as a second, independent print-on-demand supplier.
Use this for products Printify doesn't do well (embroidery), keep Printify
for everything else — both suppliers' products live in the same **Print on
Demand** category and check out identically; only the backend fulfillment
routing differs (tracked via each product's `fulfillment` metadata).

**In Printful:**

1. Create your synced products (Printful → Stores → your store → Products) —
   the sync script only pulls products that are already synced in Printful,
   it does not create them there.
2. Go to **Stores → your store → API** and generate a private token.

**In this repo:**

```bash
# apps/backend/.env
PRINTFUL_API_TOKEN=...
PRINTFUL_STORE_ID=            # optional, only for multi-store tokens
PRINTFUL_AUTO_PRODUCTION=false
```

Then pull your Printful catalog into the store:

```bash
cd apps/backend
npx medusa exec ./src/scripts/sync-printful-products.ts
```

What you get:

- Every synced Printful product appears under **Print on Demand** — title,
  mockup images, size/color (and other) variant options, and your Printful
  retail price. Each variant already quotes its own currency in Printful, so
  the sync converts from that currency into every other store currency at
  the live market rate and rounds to a `.99` charm price
  (`PRINTFUL_PSYCHOLOGICAL_ROUNDING=false` to keep exact converted amounts
  instead).
- **Paid orders containing Printful items are submitted to Printful
  automatically** (as drafts, mirroring Printify). Set
  `PRINTFUL_AUTO_PRODUCTION=true` to confirm straight to production instead.
  The Printful order ID is saved on the Medusa order for support lookups.
- Re-run the sync script any time you add/change synced products in Printful.

## 3. Shipment tracking (Printify + Printful → customer email)

Once an order is submitted to Printify/Printful and they ship it, this
registers webhooks so the tracking number gets stored on the Medusa order
and the customer gets a "your order shipped" email automatically.

```bash
# apps/backend/.env
BACKEND_PUBLIC_URL=https://your-backend.up.railway.app   # this backend's public URL
PRINTIFY_WEBHOOK_TOKEN=...   # any random string, e.g. `openssl rand -hex 24`
PRINTFUL_WEBHOOK_TOKEN=...   # same idea, independent secret
```

Then register the webhooks (safe to re-run — it's idempotent):

```bash
cd apps/backend
npx medusa exec ./src/scripts/setup-fulfillment-webhooks.ts
```

Only registers a supplier's webhook if that supplier is already configured
(has an API token) — run it again after adding Printful if you set up
Printify first, or vice versa.

## 4. Stripe (the "all payment methods" answer)

Shopify bundles payments because Shopify Payments *is* a payment processor.
The equivalent here is Stripe: one integration gives you cards, Apple Pay,
Google Pay, Link, and — enabled from the Stripe dashboard, no code — local
methods like Klarna, iDEAL, Bancontact and MobilePay.

1. Create a Stripe account (works with your US LLC + Mercury when ready, or a
   Danish account) and copy the **secret key** and **publishable key**.
2. Configure:

```bash
# apps/backend/.env
STRIPE_API_KEY=sk_live_...        # or sk_test_... to trial it
STRIPE_WEBHOOK_SECRET=whsec_...   # optional locally, required in production

# apps/storefront/.env.local
NEXT_PUBLIC_STRIPE_KEY=pk_live_...
```

3. Enable Stripe on your regions (one-time):

```bash
cd apps/backend
npx medusa exec ./src/scripts/enable-stripe.ts
```

4. Restart backend + storefront. Checkout now shows card/wallet payment; the
   storefront already supports Stripe cards, iDEAL and Bancontact out of the
   box. Turn additional methods on in the Stripe dashboard →
   **Settings → Payment methods**.

The manual "test payment" provider stays available for development.

## 5. Resend (transactional email)

Already live in dev mode: emails render to `apps/backend/.medusa/emails/`.
To actually send:

```bash
# apps/backend/.env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Shoppen <orders@yourdomain.com>"   # domain verified in Resend
STOREFRONT_URL=https://yourdomain.com                  # used in email links
```

Covered: order confirmation, account welcome, order-transfer requests,
shipment notifications (§3), abandoned-cart recovery (§7).

### Newsletter signup (footer)

Optional, layered on top of Resend. The footer's "Stay in the loop" form
posts to `/store/newsletter`, which no-ops (form still succeeds, nothing is
stored) until this is set:

```bash
# apps/backend/.env
RESEND_AUDIENCE_ID=...   # Resend → Audiences → create one, copy its ID
```

## 6. PostHog (analytics + session replay)

Cookieless, so it doesn't legally require a cookie-consent banner. Free tier
covers 1M events/month — a new store won't come close for a long time.

1. Sign up at [posthog.com](https://posthog.com), create a project, copy the
   **Project API Key** (Project Settings → Project API Key).
2. Configure:

```bash
# apps/storefront/.env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # or eu.i.posthog.com
```

3. Restart the storefront. Pageviews, session replay and funnels start
   showing up in the PostHog dashboard immediately — no further code needed.
   `sdk.capture()` calls can be added later for custom events (e.g.
   "add_to_cart") if you want funnel-level detail beyond pageviews.

## 7. Abandoned cart recovery

Runs automatically once Resend is configured (§5) — no separate switch.
Every hour, a scheduled job looks for carts that have items, an email on
file, and have sat idle for 3+ hours (and aren't older than a week), and
sends a single "you left something behind" email with a link back to that
exact cart. Each cart is only ever emailed once
(tracked via `cart.metadata.abandoned_recovery_sent_at`).

The recovery link (`/{countryCode}/cart?cart_id=...`) re-adopts that cart as
the visitor's active cart — including for a signed-out visitor on a new
device — so checkout continues normally from there.

## 8. Sentry (error monitoring)

Both apps report crashes/exceptions the moment a DSN is set — nothing else
to configure for basic error capture.

1. Sign up at [sentry.io](https://sentry.io), create **two** projects (one
   Next.js, one Node) so backend/frontend errors don't mix. Copy each DSN.
2. Configure:

```bash
# apps/backend/.env
SENTRY_DSN=https://...@o0.ingest.sentry.io/...

# apps/storefront/.env.local
SENTRY_DSN=https://...@o0.ingest.sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@o0.ingest.sentry.io/...   # same value, browser-exposed copy
```

3. Restart both apps. Optional: `SENTRY_ORG` / `SENTRY_PROJECT` /
   `SENTRY_AUTH_TOKEN` on the storefront enable source-map upload during
   build, giving you readable stack traces instead of minified ones.

## 9. Product reviews — on hold

Deferred until the catalog has more than a couple of products and Stripe is
live (no point collecting reviews before there's anything to review or a way
to actually buy).

**Judge.me was the original plan but is no longer viable**: they sunset
support for every non-Shopify platform (WooCommerce, BigCommerce, custom/
headless — everything) in January 2026. Their signup flow now redirects
straight into Shopify's app install, with no path for a Medusa store.

**[REVIEWS.io](https://www.reviews.io)** is the replacement pick when we
revisit — genuinely platform-agnostic with a real API for custom/headless
backends (unlike e.g. Junip, whose "headless" support specifically means
Shopify Hydrogen and still requires a Shopify backend underneath). Essentials
tier is $20/mo (300 reviews) with a 14-day free trial. Whenever ready: sign
up, get an API key, and the integration — plus the product-sync step
reviews platforms need (mirroring the Printify sync pattern) — gets built
against a real account.

---

## Sanity checklist after flipping anything on

1. Backend logs show no errors on boot (`✔ Server is ready on port: 9000`).
2. Place a test order end-to-end on `localhost:8000`.
3. Printify/Printful: the order appears in the respective dashboard's Orders
   (as draft unless auto-production). Email: check your inbox (or
   `.medusa/emails/` without a key). Stripe: payment appears in the Stripe
   dashboard (test mode first!).
