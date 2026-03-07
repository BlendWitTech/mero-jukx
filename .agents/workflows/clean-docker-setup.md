---
description: Complete Docker cleanup and fresh setup — removes ALL node_modules (root, api, app, microservices), Docker volumes, .env files, and reinstalls everything from scratch
---

# /clean-docker-setup Workflow

Use this when the dev environment is broken, Docker data is stale, or after major dependency changes.

## What the Reset Removes
- ALL `node_modules` folders: root, `api/`, `app/`, and every microservice under `api/marketplace/` and `app/marketplace/`
- All `dist/` build folders
- Docker containers **and** project volumes (PostgreSQL data, Redis data — all DB data is wiped)
- `.env` files
- Logs, npm cache, uploads

## Steps

1. **Stop all running servers first**
   - Close the `Mero Jugx - Backend` and `Mero Jugx - Frontend` terminal windows
   - Or press `Ctrl+C` in the terminal running `npm run start`

2. **Run the full reset**
   ```powershell
   npm run reset
   ```
   - Choose option `1` (Everything) and type `RESET` when prompted
   - This will handle Docker stop + volume removal automatically — **no manual Docker steps needed**

3. **Run setup to reinstall everything fresh**
   ```powershell
   npm run setup
   ```
   - Reinstalls ALL dependencies (root + api + app + every microservice)
   - Creates fresh `.env` files from `.env.example`
   - Starts Docker containers (PostgreSQL + Redis) automatically
   - ⚠ This takes several minutes — all packages are being downloaded fresh

4. **Initialize the database**
   ```powershell
   npm run db:init
   ```
   - Creates all tables and seeds base data

5. **Start the development servers**
   ```powershell
   npm run start
   ```

## After Start: Fix Browser Cache (for React/Vite errors)

If you see `Invalid hook call` or chunk version mismatch errors after restarting:
- Do a **hard browser refresh**: `Ctrl + Shift + R`
- Or open DevTools → right-click the reload button → **"Empty Cache and Hard Reload"**

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `npm run setup` fails on Docker step | Make sure Docker Desktop is running before setup |
| `npm run db:init` fails with connection error | Wait 10s for Postgres to be ready, then retry |
| `node_modules` still locked during reset | Close VS Code or any editors with open files, then retry |
| Port 3000/3001 already in use after restart | Kill the old process: `npx kill-port 3000 3001` |
