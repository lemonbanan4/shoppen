# Deploying Solkast to Railway

One Railway project hosts everything: Postgres, Redis, the Medusa backend
(+ admin at `/app`), and the Next.js storefront. Expect ~$10–15/month.

## One-time human step

```bash
railway login          # opens the browser — takes 30 seconds
```

Everything after that can be driven from the CLI (Claude can do it for you).

## The sequence

### 1. Project + databases

```bash
cd medusa-solkast
railway init --name solkast          # create project
railway add --database postgres
railway add --database redis
```

### 2. Backend service

```bash
railway add --service backend       # create empty service
```

Set service **root directory** to `apps/backend` (dashboard → backend service →
Settings → Root Directory). The `railway.json` there handles build & start
(including migrations on boot). Then set variables on the backend service:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `JWT_SECRET` | fresh 64-hex secret (`openssl rand -hex 32`) |
| `COOKIE_SECRET` | fresh 64-hex secret |
| `AUTH_MFA_ENCRYPTION_KEY` | fresh 64-hex secret |
| `STORE_CORS` | storefront URL (e.g. `https://solkast.up.railway.app`) |
| `ADMIN_CORS` | backend URL (e.g. `https://backend.up.railway.app`) |
| `AUTH_CORS` | both URLs, comma-separated |
| `STOREFRONT_URL` | storefront URL (used in emails) |
| `PRINTIFY_API_TOKEN` | your token |
| `PRINTIFY_AUTO_PRODUCTION` | `false` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | when you have them |
| `STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET` | when you have them |

Deploy: `railway up --service backend` (from `apps/backend`), then generate a
public domain for the service (Settings → Networking → Generate Domain).

### 3. Running scripts against production

Migrations run automatically on boot. Everything else is a script you run
from your own machine, pointed at the production database.

Two things make this fiddly, and both have bitten us:

1. **`railway run` is not enough on its own.** It injects the service's
   `DATABASE_URL`, which is `postgres.railway.internal` — a hostname that
   only resolves *inside* Railway's network. From a laptop it fails with
   `getaddrinfo ENOTFOUND postgres.railway.internal`. Use the Postgres
   service's `DATABASE_PUBLIC_URL` (a TCP proxy) instead.
2. **The service is named `@dtc/backend`, not `backend`.** `--service backend`
   returns `Service not found`. Since `apps/backend` is already linked to it,
   just omit the flag.

A shell-set `DATABASE_URL` takes precedence over the one in `apps/backend/.env`,
so this targets production while still reading your local API tokens:

```bash
cd apps/backend
export DATABASE_URL="$(railway variables --service Postgres --kv \
  | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)"
```

Then run any script in that same shell. **Both syncs delete and recreate
every product they manage**, so expect the storefront to be briefly thin
while they run:

```bash
npx medusa exec ./src/scripts/sync-printful-products.ts
npx medusa exec ./src/scripts/sync-printify-products.ts
npx medusa exec ./src/scripts/seed-bundle-promo.ts
npx medusa user -e you@example.com -p <admin-password>
```

Open a fresh terminal (or `unset DATABASE_URL`) to go back to local work —
otherwise you are still pointed at production.

Grab the production publishable key (Admin → Settings → Publishable API keys,
or from the `api_key` table) for the storefront.

### 4. Storefront service

```bash
railway add --service storefront
```

Root directory: `apps/storefront`. Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | backend public URL |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | production key from step 3 |
| `NEXT_PUBLIC_BASE_URL` | storefront public URL |
| `NEXT_PUBLIC_DEFAULT_REGION` | `dk` |
| `NEXT_PUBLIC_STRIPE_KEY` | when you have it |

Deploy: `railway up --service storefront` (from `apps/storefront`), generate a
domain. Note: the storefront build calls the backend, so deploy it **after**
the backend is live and seeded.

### 5. Custom domain (later)

Add your domain on each service (Settings → Networking → Custom Domain), point
DNS at Railway, then update the CORS / URL variables above to match and
redeploy.

## Sanity checklist

- `https://<backend>/health` → 200, admin loads at `/app`
- Storefront homepage shows products; add to cart; place a test order
  (manual payment) end-to-end
- Order appears in the admin and (as a draft) in Printify
