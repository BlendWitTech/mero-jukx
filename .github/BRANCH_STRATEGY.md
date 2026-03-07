# Git Branching Strategy

## Overview

This repository uses a protected branching strategy with four main branches and a strict feature branch workflow. Direct pushes to protected branches are not allowed for contributors.

## Branch Structure

```
main (🔒 LOCKED - Owner Only)
├── development (🔒 Protected - Requires PR)
│   ├── development/feature-*
│   ├── development/bugfix-*
│   └── development/hotfix-*
├── testing (🔒 Protected - Requires PR)
│   ├── testing/feature-*
│   ├── testing/bugfix-*
│   └── testing/hotfix-*
└── production (🔒 Protected - Requires PR)
    ├── production/feature-*
    ├── production/bugfix-*
    └── production/hotfix-*
```

## Branch Permissions

### Main Branch (`main`)
- **Access**: Repository owner only
- **Protection**:
  - Direct pushes blocked for everyone except owner
  - Pull requests require owner approval
  - All CI checks must pass
  - No force pushes or branch deletion

### Protected Branches (`development`, `testing`, `production`)
- **Access**: Users with assigned permissions (see [COLLABORATOR_ACCESS.md](COLLABORATOR_ACCESS.md))
- **Protection**:
  - Direct pushes blocked (must use feature branches)
  - Pull requests required for merging
  - All CI checks must pass
  - At least one approval required
  - No force pushes

### Feature Branches
- **Naming Convention**: `{parent-branch}/feature-{description}`
  - Examples: `development/feature-user-auth`, `testing/feature-payment`, `production/feature-api-v2`
- **Access**: Any user can create and push to feature branches
- **Workflow**:
  1. Create feature branch from parent branch
  2. Make changes and commit
  3. Push to feature branch
  4. CI/CD runs automatically
  5. Create pull request to parent branch
  6. After approval, merge to parent branch

## Branch Types

### Development Branch (`development`)
- **Purpose**: Active development work
...existing code...
- **Target Audience**: Developers working on new features
- **Feature Branch Pattern**: `development/feature-*`, `development/bugfix-*`
- **Merges To**: `main` (via owner approval)

### Testing Branch (`testing`)
- **Purpose**: Testing and QA work
- **Target Audience**: QA engineers and testers
- **Feature Branch Pattern**: `testing/feature-*`, `testing/bugfix-*`
- **Merges To**: `main` (via owner approval)

### Production Branch (`production`)
- **Purpose**: Production-ready code
- **Target Audience**: Release managers and senior developers
- **Feature Branch Pattern**: `production/feature-*`, `production/hotfix-*`
- **Merges To**: `main` (via owner approval)

## Workflow

### 1. Creating a Feature Branch

```bash
# Checkout the parent branch you have access to
git checkout development  # or testing, or production
git pull origin development

# Create and checkout a new feature branch
git checkout -b development/feature-my-feature

# Or use the helper script
npm run branch:create
```

### 2. Making Changes

```bash
# Make your changes
# ... edit files ...

# Commit your changes
git add .
git commit -m "feat: add new feature"

# Push to your feature branch
git push origin development/feature-my-feature
```

### 3. CI/CD Pipeline

When you push to a feature branch:
- ✅ Tests run automatically
- ✅ Lint check runs
- ✅ Build verification runs
- ✅ Branch protection checks run

### 4. Creating a Pull Request

After CI passes:
1. Go to GitHub and create a pull request
2. Target your parent branch (development/testing/production)
3. Wait for review and approval
4. Merge when approved

### 5. Merging to Main

Only the repository owner can merge to `main`:
- From `development` → `main` (after testing)
- From `testing` → `main` (after QA approval)
- From `production` → `main` (for releases)

## Helper Scripts

### Create Feature Branch
```bash
npm run branch:create
```
Prompts for:
- Parent branch (development/testing/production)
- Branch type (feature/bugfix/hotfix)
- Branch name

### Check Branch Permissions
```bash
npm run branch:check
```
Shows which branches you have access to.

### List Feature Branches
```bash
npm run branch:list
```
Lists all feature branches for your assigned parent branch.

## Branch Protection Rules

### Main Branch
- ✅ Require pull request reviews (owner only)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Require linear history
- ✅ Do not allow bypassing the above settings
- ✅ Restrict pushes to owner only

### Development/Testing/Production Branches
- ✅ Require pull request reviews (1 approval minimum)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Do not allow force pushes
- ✅ Do not allow deletions
- ✅ Restrict pushes (feature branches only)

## CI/CD Pipeline

The CI/CD pipeline automatically:
1. **Checks branch protection** - Prevents direct pushes to protected branches
2. **Runs tests** - Ensures code quality
3. **Runs lint check** - Ensures code style
4. **Builds project** - Ensures buildability
5. **Creates PR** - Auto-creates PR from feature branch to parent (optional)

## Getting Branch Access

To get access to a branch (development/testing/production):
1. Contact the repository owner
2. Request access to the specific branch
3. Owner will grant access via GitHub branch protection settings
4. You'll receive notification when access is granted

## Emergency Hotfixes

For critical production issues:
1. Create branch: `production/hotfix-{issue-description}`
2. Make minimal fix
3. Push and create PR to `production`
4. After merge, create PR from `production` to `main`
5. Owner reviews and merges to `main`

## Best Practices

1. **Always work on feature branches** - Never push directly to protected branches
2. **Keep branches up to date** - Regularly pull from parent branch
3. **Write descriptive commit messages** - Follow conventional commits
4. **Create small PRs** - Easier to review and merge
5. **Wait for CI to pass** - Don't merge if CI is failing
6. **Get approvals** - Don't merge your own PRs (unless you're the owner)

## Troubleshooting

### "Direct push to protected branch is not allowed"
- **Solution**: Create a feature branch instead
- Example: `git checkout -b development/feature-my-feature`

### "You don't have permission to push to this branch"
- **Solution**: Contact repository owner to grant branch access
- Or: Work on a feature branch under your assigned parent branch

### "CI checks are failing"
- **Solution**: Fix the failing tests/lint/build issues
- Check the CI logs for details

### "Cannot create PR to main"
- **Solution**: Only repository owner can create PRs to main
- Create PR to your assigned branch (development/testing/production) instead

