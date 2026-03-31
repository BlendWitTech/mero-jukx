# Deployment Guide — Vercel + Railway + Subdomain Routing

Complete guide to deploy Mero Jugx on **Vercel** (frontend) + **Railway** (backend) with each marketplace app on its own subdomain.

---

## Architecture Overview

```
DNS: *.merojugx.com  →  Vercel (wildcard)
     api.merojugx.com →  Railway (NestJS)

User visits accounting.merojugx.com
  │
  ├── Vercel serves the same React SPA (index.html)
  │
  └── React detects subdomain "mero-accounting" via urlConfig.ts
        └── Renders MeroAccountingRouter directly
```

### Domain Map

| Domain | Service | Purpose |
|--------|---------|---------|
| `merojugx.com` | Vercel | Main app (login, dashboard, marketplace) |
| `www.merojugx.com` | Vercel | Redirects to `merojugx.com` |
| `mero-accounting.merojugx.com` | Vercel | Mero Accounting app |
| `mero-inventory.merojugx.com` | Vercel | Mero Inventory app |
| `mero-hr.merojugx.com` | Vercel | Mero HR app |
| `mero-board.merojugx.com` | Vercel | Mero Board app |
| `mero-khata.merojugx.com` | Vercel | Mero Khata app |
| `mero-social.merojugx.com` | Vercel | Mero Social app |
| `mero-crm.merojugx.com` | Vercel | Mero CRM app |
| `mero-cms.merojugx.com` | Vercel | Mero CMS (Coming Soon) |
| `api.merojugx.com` | Railway | NestJS REST API |

### How the Subdomain Routing Works (Already Built)

The code in `app/src/config/urlConfig.ts` already handles everything:

- **localhost** → path-based routing (`/org/{orgSlug}/app/{appSlug}`) — no DNS needed
- **`*.merojugx.com`** → subdomain-based (`getAppNameFromSubdomain()` extracts the slug)
- The slug maps directly to the database app slug (e.g., `mero-accounting` → app slug `mero-accounting`)
- `App.tsx` renders `AppViewPage` on any app subdomain, which loads the correct router

---

## Part 1: Railway — Backend Setup

### 1.1 Create Railway Project (Testing)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select your repository, branch: `testing`
3. Railway detects `railway.json` automatically

### 1.2 Create Railway Project (Production)

Repeat the same steps but:
- Branch: `production`
- This will be a separate Railway project with its own PostgreSQL and Redis

### 1.3 Add PostgreSQL and Redis (Do this for both projects)

1. In the Railway project → **New Service** → **Database** → **Add PostgreSQL**
2. **New Service** → **Database** → **Add Redis**
3. Railway creates both and provides reference variables

### 1.4 Environment Variables (Both Projects)

In the Railway API service → **Variables** tab:

```bash
# App
NODE_ENV=production
PORT=3000

# Database — reference Railway Postgres service directly
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}

# Redis — reference Railway Redis service directly
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}

# Auth — generate strong secrets (32+ chars each)
JWT_SECRET=replace-with-64-char-random-secret
JWT_REFRESH_SECRET=replace-with-64-char-random-secret-2

# CORS — all subdomains must be allowed
FRONTEND_URL=https://merojugx.com
CORS_ORIGINS=https://merojugx.com,https://*.merojugx.com

# Email (Resend)
RESEND_API_KEY=re_your_key
EMAIL_FROM=noreply@merojugx.com

# First deploy only — set to false after DB is initialized
AUTO_INIT_DB=true
RUN_MIGRATIONS=true
RUN_SEEDS=true

# Payments
ESEWA_MERCHANT_ID=your_merchant_id
ESEWA_SECRET_KEY=your_secret
KHALTI_SECRET_KEY=your_key
STRIPE_SECRET_KEY=sk_live_your_key       # sk_test_ for staging
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Rate limiting
THROTTLE_LIMIT=100
THROTTLE_TTL=60
```

> **Staging**: Use test payment keys, `THROTTLE_LIMIT=1000`, keep `AUTO_INIT_DB=true`
> **Production**: Use live keys, `AUTO_INIT_DB=false` after first deploy

### 1.5 Custom Domain for API

1. Railway service → **Settings** → **Domains** → **Custom Domain**
2. Add `api.merojugx.com`
3. Railway shows a CNAME target — copy it
4. In your DNS provider, add: `api CNAME <railway-target>.railway.app`

### 1.6 Get Service IDs (for CI/CD)

In Railway → each service → **Settings** → copy the **Service ID**. You'll need:
- `RAILWAY_SERVICE_ID_TESTING` → testing environment service ID
- `RAILWAY_SERVICE_ID_PRODUCTION` → production service ID

Add these to GitHub Secrets along with:
- `RAILWAY_TOKEN_TESTING` — Railway token for testing project
- `RAILWAY_TOKEN_PRODUCTION` — Railway token for production project

---

## Part 2: Vercel — Frontend Setup

### 2.1 Create Vercel Project

1. [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo
2. Vercel detects `vercel.json` automatically:
   - **Build Command:** `cd app && npm ci && npm run build`
   - **Output Directory:** `app/dist`

### 2.2 Environment Variables

In Vercel project → **Settings** → **Environment Variables**:

```bash
# Production
VITE_API_URL=https://api.merojugx.com

# Preview (testing branch deploys)
VITE_API_URL=https://api-testing.merojugx.com   # or your Railway testing URL
```

Set the **Production** variable for the `production` branch and **Preview** for all other branches.

### 2.3 Add Wildcard Domain (Critical for subdomains)

In Vercel project → **Settings** → **Domains**:

1. Add `merojugx.com` (root domain)
2. Add `www.merojugx.com` → configure as redirect to `merojugx.com`
3. Add `*.merojugx.com` (wildcard)

Vercel will show DNS records for each. All of them point to Vercel.

> **Note:** Wildcard domains require a **Pro plan** on Vercel ($20/month). On the free Hobby plan you must add each subdomain individually (e.g., `mero-accounting.merojugx.com`, `mero-inventory.merojugx.com`, etc.).

### 2.4 Configure vercel.json for Wildcard

The `vercel.json` is already correct. All routes return `index.html` (SPA fallback), so every subdomain serves the React app and the client-side code handles the rest.

---

## Part 3: DNS Configuration

All DNS records go in your domain registrar (e.g., Namecheap, Cloudflare, etc.).

### 3.1 Records to Add

```
Type    Host                Value
------  ------------------  ----------------------------------------
A       @                   76.76.21.21       (Vercel IP for root)
CNAME   www                 cname.vercel-dns.com
CNAME   *                   cname.vercel-dns.com   (wildcard)
CNAME   api                 <your-service>.railway.app
```

> Vercel will show the exact values when you add each domain. Use those — the IPs above are examples.

### 3.2 If Using Cloudflare

- Set all Vercel records to **DNS only** (gray cloud), not proxied
- Railway custom domain also needs **DNS only**
- Cloudflare proxy can interfere with Railway's SSL

### 3.3 Propagation

DNS changes take 15 minutes to 48 hours. Vercel and Railway will show SSL as "Pending" until propagation completes.

---

## Part 4: App Subdomain Slug Reference

The subdomain prefix must exactly match the app's database slug:

| Subdomain Prefix | App Slug in DB | App |
|-----------------|----------------|-----|
| `mero-accounting` | `mero-accounting` | Mero Accounting |
| `mero-inventory` | `mero-inventory` | Mero Inventory |
| `mero-hr` | `mero-hr` | Mero HR |
| `mero-board` | `mero-board` | Mero Board |
| `mero-khata` | `mero-khata` | Mero Khata |
| `mero-social` | `mero-social` | Mero Social |
| `mero-crm` | `mero-crm` | Mero CRM |
| `mero-cms` | `mero-cms` | Mero CMS (Coming Soon) |

The `getAppNameFromSubdomain()` function in `urlConfig.ts` extracts the prefix from the hostname, then `AppViewPage.tsx` queries the API for `GET /marketplace/apps/slug/{slug}` to load the app.

---

## Part 5: Local Development

No DNS changes needed for localhost. The existing code automatically uses path-based routing:

```
http://localhost:5173/org/{orgSlug}/app/mero-accounting
http://localhost:5173/org/{orgSlug}/app/mero-inventory
```

To test subdomain routing locally, add entries to your `hosts` file:
```
127.0.0.1   mero-accounting.localhost
127.0.0.1   mero-inventory.localhost
```
Then update `urlConfig.ts` to also match `*.localhost` patterns (optional).

---

## Part 6: GitHub Secrets Checklist

All secrets needed for CI/CD (GitHub → repo Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN_TESTING` | Railway API token for testing project |
| `RAILWAY_TOKEN_PRODUCTION` | Railway API token for production project |
| `RAILWAY_SERVICE_ID_TESTING` | Railway service ID for testing API |
| `RAILWAY_SERVICE_ID_PRODUCTION` | Railway service ID for production API |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel org/team ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `TESTING_API_URL` | Testing Railway URL (for VITE_API_URL in preview builds) |

---

## Part 7: Deployment Flow

```
Push to develop
    │
    └── CI runs (tests + build checks)

PR: develop → testing
    │
    └── Merge triggers deploy-staging.yml
          ├── Railway Testing: railway up --service=TESTING
          └── Vercel: preview build with TESTING_API_URL

PR: testing → main
    │
    └── Merge triggers test-gate.yml (full E2E suite)
          └── All 7 test suites must pass

PR: main → production
    │
    └── Merge triggers deploy-production.yml
          ├── Railway Production: railway up --service=PRODUCTION
          └── Vercel Production: vercel build --prod
```

---

## Part 8: Post-Deployment Checklist

### Backend Health
- [ ] `https://api.merojugx.com/health` → `{ "status": "ok" }`
- [ ] Check Railway logs for "Database initialized" and "Seeded role: Organization Owner"
- [ ] `GET https://api.merojugx.com/api/v1/packages` returns package list

### Frontend + Subdomains
- [ ] `https://merojugx.com` → login page loads
- [ ] Register a test organization
- [ ] Install an app from marketplace
- [ ] `https://mero-accounting.merojugx.com` → redirects to login if not authenticated, loads Mero Accounting if logged in
- [ ] Repeat for each installed app subdomain

### CORS
- [ ] No CORS errors when the frontend calls the API
- [ ] Check that `CORS_ORIGINS` on Railway includes `https://*.merojugx.com`

---

## Common Issues

### "Subdomain loads blank page"
- Vercel wildcard domain is not configured → add `*.merojugx.com` in Vercel Domains
- Or DNS not propagated yet → wait and retry

### "App subdomain shows main dashboard instead of app"
- The subdomain prefix doesn't match the app slug in the database
- Check `getAppNameFromSubdomain()` returns the right slug for your hostname

### "CORS error on subdomain"
- `CORS_ORIGINS` on Railway must include wildcard: `https://*.merojugx.com`
- No trailing slash in any origin value

### "Railway build fails"
- Check root `package.json` has `build:api` and `start:prod:api` scripts
- Or set **Root Directory** to `api` in Railway service settings and use `npm ci && npm run build` / `node dist/main.js`

### "Vercel free plan — wildcard not working"
- Wildcard domains (`*.merojugx.com`) require Vercel Pro
- On free plan: add each subdomain individually in Vercel Domains settings

### "Redis connection refused on Railway"
- Both API and Redis must be in the **same Railway project**
- Use `${{Redis.REDISHOST}}` reference variable, not a hardcoded host
