# Branch Strategy

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full contributor guide including commit conventions and release process.

## Branch Hierarchy

```
main       ← Production (protected, owner-only, auto-deploys to Railway prod + Vercel)
  └── staging  ← Pre-production QA (protected, auto-deploys to Railway staging)
        └── develop  ← Active development (default branch, protected)
              ├── feature/short-description
              ├── fix/bug-description
              ├── hotfix/critical-fix
              └── chore/task-name
```

## Quick Reference

| Branch | Purpose | Deploys to | Who merges |
|--------|---------|-----------|-----------|
| `main` | Production releases | Railway prod + Vercel | Owner only |
| `staging` | QA / pre-prod testing | Railway staging | Maintainer + owner approval |
| `develop` | Active development | — | Any contributor via PR |
| `feature/*` `fix/*` etc. | Work in progress | — | Author |

## Branch Naming

```
feature/invoice-pdf-export
fix/token-refresh-race-condition
hotfix/esewa-callback-url
chore/upgrade-typeorm
release/v1.2.0
```

## Merge Flow

```
feature/xyz  ──PR──▶  develop  ──PR──▶  staging  ──PR──▶  main (+ tag v1.x.x)
```

## Versioning

Tags follow `v{MAJOR}.{MINOR}.{PATCH}` on `main`. See [CONTRIBUTING.md](../CONTRIBUTING.md#versioning--release-process) for the full release process.
