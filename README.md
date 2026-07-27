# Solkast — print-on-demand streetwear store

An independent streetwear brand, printed to order. Full commerce stack in a Turborepo
monorepo: a Medusa v2 backend (with admin dashboard) and a Next.js storefront, deployed
to Railway alongside Postgres and Redis.

## Apps

| App | What it is |
|---|---|
| `apps/backend` | Medusa v2 — products, carts, orders, admin at `/app`, custom modules/workflows/jobs |
| `apps/storefront` | Next.js storefront — Stripe checkout, PostHog analytics, Sentry error tracking |

## Print-on-demand pipeline

Products are designed in-repo (`merch-designs/`) and pushed through a scripted
fulfillment pipeline rather than managed by hand:

- Catalog sync and product management scripts for Printify and Printful
  (`apps/backend/src/scripts/` — catalog inspection, product sync, collection assignment,
  demo/seed cleanup)
- Mockup generation (`scripts/generate-printful-mockups.py`) that fits artwork to each
  product's print area instead of stretching it
- Capsule-based drops: the mockup manifest is rebuilt per capsule

## Stack

- **Backend:** Medusa v2 (Node/TypeScript), Postgres, Redis, Zod
- **Storefront:** Next.js, Medusa JS SDK, Stripe, Headless UI, PostHog, Sentry
- **Email:** Resend (falls back to writing emails to disk in dev)
- **Deploy:** Railway — one project runs Postgres, Redis, backend + admin, and the
  storefront (see [DEPLOY.md](DEPLOY.md)); integration setup lives in
  [SETUP-INTEGRATIONS.md](SETUP-INTEGRATIONS.md)

## Run locally

```bash
npm install
npm run dev        # turborepo: backend on :9000 (admin at /app), storefront on :8000
```

Copy `apps/backend/.env.template` and `apps/storefront/.env.template` and fill in what you
need — Stripe, Printify/Printful, and Resend keys are all optional in dev (email falls back
to disk, print-provider scripts simply skip).
