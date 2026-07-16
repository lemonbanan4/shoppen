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
  Printify retail prices (USD, mirrored 1:1 to EUR — adjust in the admin at
  `localhost:9000/app` if you want different EU pricing).
- **Paid orders containing Printify items are submitted to Printify
  automatically** (as review drafts). Set `PRINTIFY_AUTO_PRODUCTION=true` to
  skip review and send straight to production. The Printify order ID is saved
  on the Medusa order for support lookups.
- Re-run the sync script any time you add/change products in Printify.

## 2. Stripe (the "all payment methods" answer)

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

## 3. Resend (transactional email)

Already live in dev mode: emails render to `apps/backend/.medusa/emails/`.
To actually send:

```bash
# apps/backend/.env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Shoppen <orders@yourdomain.com>"   # domain verified in Resend
STOREFRONT_URL=https://yourdomain.com                  # used in email links
```

Covered: order confirmation, account welcome, order-transfer requests.

---

## Sanity checklist after flipping anything on

1. Backend logs show no errors on boot (`✔ Server is ready on port: 9000`).
2. Place a test order end-to-end on `localhost:8000`.
3. Printify: the order appears in Printify → Orders (as draft unless
   auto-production). Email: check your inbox (or `.medusa/emails/` without a
   key). Stripe: payment appears in the Stripe dashboard (test mode first!).
