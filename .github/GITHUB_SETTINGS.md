# GitHub Repository Settings

One-time setup the owner must complete after the branches are pushed.

## 1. Set Default Branch

`Settings → General → Default branch` → set to **`develop`**

## 2. Branch Protection Rules

Go to `Settings → Branches → Add rule` for each branch below:

---

### Rule: `develop`

| Setting | Value |
|---------|-------|
| Require a pull request before merging | ✅ |
| Required approvals | 1 |
| Require status checks to pass | ✅ |
| Required checks | `API Tests (E2E)`, `Frontend Build Check`, `Backend Build Check` |
| Require branches to be up to date | ✅ |
| Do not allow bypassing the above | ✅ |

---

### Rule: `testing`

| Setting | Value |
|---------|-------|
| Require a pull request before merging | ✅ |
| Required approvals | 1 (owner must approve) |
| Require status checks to pass | ✅ |
| Required checks | `API Tests (E2E)`, `Enforce branch protection` |
| Restrict who can push | ✅ → add only the repo owner |
| Do not allow bypassing the above | ✅ |

---

### Rule: `main`

| Setting | Value |
|---------|-------|
| Require a pull request before merging | ✅ |
| Required approvals | 1 (owner only) |
| Require status checks to pass | ✅ |
| Required checks | `Full E2E Test Suite`, `Enforce branch protection` |
| Restrict who can push | ✅ → owner only |
| Do not allow force pushes | ✅ |
| Do not allow deletions | ✅ |

---

### Rule: `production`

| Setting | Value |
|---------|-------|
| Require a pull request before merging | ✅ |
| Required approvals | 1 (owner only) |
| Require status checks to pass | ✅ |
| Required checks | `Enforce branch protection` |
| Restrict who can push | ✅ → owner only |
| Do not allow force pushes | ✅ |
| Do not allow deletions | ✅ |

---

## 3. Required Secrets

`Settings → Secrets and variables → Actions → New repository secret`

### Deployment secrets

| Secret name | Where to get it |
|-------------|----------------|
| `RAILWAY_TOKEN_TESTING` | Railway dashboard → Account Settings → Tokens |
| `RAILWAY_TOKEN_PRODUCTION` | Railway dashboard → Account Settings → Tokens |
| `RAILWAY_SERVICE_ID_TESTING` | Railway service URL (last path segment) |
| `RAILWAY_SERVICE_ID_PRODUCTION` | Railway service URL (last path segment) |
| `TESTING_API_URL` | Your Railway testing service URL, e.g. `https://mero-jugx-testing.up.railway.app` |
| `PRODUCTION_API_URL` | Your Railway production service URL |
| `VERCEL_TOKEN` | Vercel dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel project settings → General |
| `VERCEL_PROJECT_ID` | Vercel project settings → General |
| `VERCEL_PRODUCTION_URL` | Your production Vercel URL |

## 4. GitHub Environments

`Settings → Environments → New environment`

Create two environments:
- **`production`** — add protection rule: require owner approval before deploy

The `testing` environment does not need to be created (no protection needed there).

## 5. Branch Flow Summary

```
Developer workflow:
  git checkout develop
  git checkout -b feature/my-feature
  git push origin feature/my-feature
  → Open PR to develop
  → Owner reviews + merges

Owner promotion flow:
  develop → testing    (PR: triggers Vercel preview + Railway testing deploy)
  testing → main       (PR: triggers full test suite — must pass)
  main    → production (PR: triggers Railway prod + Vercel prod deploy)
```
