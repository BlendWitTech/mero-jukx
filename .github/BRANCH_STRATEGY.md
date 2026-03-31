# Branch Strategy

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full contributor guide.

## Branch Hierarchy

```
main         ← Source of truth (protected, owner-only direct push)
  └── production  ← Production-ready code → deploys to Railway prod + Vercel prod
        └── testing     ← QA / pre-production → deploys to Railway testing
              └── develop  ← Active development (default branch)
                    ├── feature/short-description
                    ├── fix/bug-description
                    └── chore/task-name
```

## Branch Reference

| Branch | Purpose | Deploys to | Who merges |
|--------|---------|-----------|-----------|
| `main` | Source of truth, git history | — | Owner only (via PR from production) |
| `production` | Production-ready code | Railway prod + Vercel | Maintainer + owner approval |
| `testing` | QA / staging | Railway testing env | Any contributor via PR |
| `develop` | Active development | — (local only) | Any contributor via PR |
| `feature/*` `fix/*` etc. | Work in progress | — | Author |

## Merge Flow

```
feature/xyz ──PR──▶ develop ──PR──▶ testing ──PR──▶ production ──PR──▶ main
                                    (QA here)         (final check)
```

## Branch Naming

```
feature/invoice-pdf-export
fix/token-refresh-race-condition
hotfix/esewa-callback-url
chore/upgrade-typeorm
```

## Branch Protection Rules

### `main`
- Owner-only direct push blocked for everyone else
- Requires PR from `production`
- All CI checks must pass

### `production`, `testing`
- Direct pushes blocked — must use PRs
- Minimum 1 approval
- All CI checks must pass

### `develop`
- PRs required for merging
- CI checks must pass
