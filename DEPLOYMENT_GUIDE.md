# Deployment Guide — Vercel + Railway

This guide covers deploying Mero Jugx to **Vercel** (frontend) + **Railway** (backend + database + Redis) for staging and production.

## Architecture Overview

```
Internet
   │
   ├── Vercel ──────── React frontend (app/)
   │                   Static SPA + CDN
   │
   └── Railway ─────── NestJS API (api/)
                        PostgreSQL 15
                        Redis 7
```

---

## Part 1: Railway — Backend

Railway hosts the NestJS API, PostgreSQL database, and Redis cache.

### Step 1: Create a Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Click **"Deploy from GitHub repo"** → select your repository
3. Railway will auto-detect `railway.json` and use it

### Step 2: Add PostgreSQL

In your Railway project:
1. Click **"New Service"** → **"Database"** → **"PostgreSQL"**
2. Railway will create a PostgreSQL 15 instance and expose `DATABASE_URL`

### Step 3: Add Redis

1. Click **"New Service"** → **"Database"** → **"Redis"**
2. Railway will create Redis and expose `REDIS_URL`

### Step 4: Configure Environment Variables

In the Railway backend service, add these environment variables:

```bash
# Application
NODE_ENV=production
PORT=3000

# Database (from Railway PostgreSQL service — copy the variables)
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}

# Redis (from Railway Redis service)
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}

# Auth — generate strong random secrets (32+ chars)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# Frontend URL (your Vercel URL after deployment)
FRONTEND_URL=https://your-app.vercel.app
CORS_ORIGINS=https://your-app.vercel.app

# Email (Resend — https://resend.com)
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# Auto-initialize DB on first deploy
AUTO_INIT_DB=true
RUN_MIGRATIONS=true
RUN_SEEDS=true

# Payment Gateways (use test credentials for staging)
ESEWA_MERCHANT_ID=your_esewa_merchant_id
ESEWA_SECRET_KEY=your_esewa_secret_key
KHALTI_SECRET_KEY=your_khalti_secret_key
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# File Storage (local for now, S3 for production)
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# Monitoring (optional but recommended)
SENTRY_DSN=https://your_sentry_dsn

# Feature flags for staging
THROTTLE_LIMIT=100
THROTTLE_TTL=60
```

### Step 5: Set Root Directory (Optional)

If you want Railway to only see the `api/` folder:
1. In Railway service settings → **"Root Directory"** → set to `api`
2. Then use simpler scripts: `npm ci && npm run build` and `node dist/main.js`

Otherwise, the root-level `railway.json` handles it automatically:
- **Build:** `npm run build:api` (installs + builds the API)
- **Start:** `npm run start:prod:api` (runs `node api/dist/main.js`)

### Step 6: Deploy

Click **"Deploy"** or push to your main branch. Railway will:
1. Install dependencies
2. Build the NestJS app (`nest build`)
3. Run migrations and seeds (if `AUTO_INIT_DB=true`)
4. Start the server

**Health check endpoint:** `GET /health`

---

## Part 2: Vercel — Frontend

Vercel hosts the React/Vite frontend as a static site with CDN delivery.

### Step 1: Connect Repository

1. Go to [vercel.com](https://vercel.com) → **"New Project"**
2. Import your GitHub repository

### Step 2: Configure Build Settings

Vercel will auto-detect `vercel.json` in the root. The config sets:
- **Build Command:** `cd app && npm ci && npm run build`
- **Output Directory:** `app/dist`
- **Install Command:** `cd app && npm install`

### Step 3: Environment Variables

In Vercel project settings → **Environment Variables**, add:

```bash
# Point the frontend to your Railway backend URL
VITE_API_URL=https://your-railway-app.railway.app

# Optionally also create a Vercel variable reference named "vite_api_url"
# (matches the @vite_api_url reference in vercel.json)
```

> **Important:** Vite environment variables must start with `VITE_` to be included in the browser bundle.

### Step 4: Deploy

Click **"Deploy"**. Vercel will build and deploy the frontend.

All routes fall back to `index.html` (configured in `vercel.json`) for client-side routing.

---

## Part 3: Post-Deployment Checklist

After both services are deployed:

### Backend Checks
- [ ] `GET https://your-railway-app.railway.app/health` → `{ status: "ok" }`
- [ ] `GET https://your-railway-app.railway.app/api/v1/packages` → returns package list
- [ ] Database migrations ran (check Railway logs)
- [ ] Seeds ran (check Railway logs for "Seeded role: Organization Owner")

### Frontend Checks
- [ ] Vercel deployment URL loads the login page
- [ ] Register a test organization
- [ ] Login works
- [ ] API calls reach the Railway backend (check browser Network tab)

### CORS Check
If you see CORS errors in the browser console:
1. Verify `FRONTEND_URL` and `CORS_ORIGINS` on Railway match your exact Vercel URL
2. Include both `https://your-app.vercel.app` and any custom domain

---

## Custom Domains

### Vercel Custom Domain
1. Vercel project settings → **"Domains"**
2. Add `app.yourcompany.com` or `yourcompany.com`
3. Update DNS as instructed by Vercel

### Railway Custom Domain
1. Railway service settings → **"Settings"** → **"Domains"**
2. Add `api.yourcompany.com`
3. Update Railway env: `FRONTEND_URL=https://yourcompany.com`

---

## Staging vs Production

Run two separate Railway projects:

| Environment | Branch | Purpose |
|-------------|--------|---------|
| **Staging** | `main` or `develop` | QA testing, team demos |
| **Production** | `production` | Live users |

For staging:
- Use test payment credentials (eSewa sandbox, Stripe test keys)
- Set `THROTTLE_LIMIT=1000` (relaxed for testing)
- Keep `AUTO_INIT_DB=true`

For production:
- Use live payment credentials
- Set `THROTTLE_LIMIT=100`
- Set `AUTO_INIT_DB=false` after first deploy (run migrations manually)

---

## Running Migrations Manually (Railway)

If you need to run migrations without redeploying:

```bash
# Using Railway CLI
railway run --service=api node -e "require('./api/dist/database/init-database-cli.js')"

# Or via Railway console in the dashboard
# Open the Railway service shell and run:
node api/dist/database/init-database-cli.js
```

---

## Logs and Monitoring

- **Railway logs:** Railway dashboard → service → **"Logs"** tab (real-time)
- **Sentry** (if configured): Error tracking and performance monitoring
- **Health endpoint:** `GET /health` — returns database, redis, and uptime status

---

## Common Issues

### "Cannot connect to database"
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` env vars
- Ensure the PostgreSQL service is running in Railway
- Check Railway service network — both services must be in the same project

### "CORS error in browser"
- Verify `FRONTEND_URL` on Railway matches the exact Vercel URL
- No trailing slash in the URL

### "Vite build fails"
- Check Node.js version: Vercel should use Node 20
- In Vercel settings → **"Node.js Version"** → set to **20.x**

### "Railway build fails with missing script"
- Ensure root `package.json` has `build:api` and `start:prod:api` scripts (added in last update)

### "Redis connection refused"
- Check `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` in Railway env vars
- Redis service must be in the same Railway project as the API
