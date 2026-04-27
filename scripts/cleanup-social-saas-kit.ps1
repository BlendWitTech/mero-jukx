# cleanup-social-saas-kit.ps1
#
# Finishes the chore/remove-social-saas-kit branch:
#   1. Deletes the orphan folders that the Cowork session couldn't unlink
#      (the Linux sandbox doesn't have write permission against the Windows mount).
#   2. Stages only the files touched by the chore (not unrelated CRLF/LF noise).
#   3. Commits and prints the next-step push command.
#
# Run from the repo root in PowerShell:
#     powershell -ExecutionPolicy Bypass -File scripts\cleanup-social-saas-kit.ps1
#
# Safe to re-run; deletions and stages are idempotent.

$ErrorActionPreference = 'Stop'

Write-Host "==> Verifying branch..." -ForegroundColor Cyan
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne 'chore/remove-social-saas-kit') {
    Write-Warning "You are on '$branch', not 'chore/remove-social-saas-kit'."
    Write-Host "    Switch with: git checkout chore/remove-social-saas-kit"
    exit 1
}

Write-Host "==> Deleting orphan folders..." -ForegroundColor Cyan
$paths = @(
    'api\marketplace\shared\mero-social',
    'api\dist\marketplace\shared\mero-social',
    'app\marketplace\shared\mero-social',
    'app\marketplace\shared\mero-saas-kit'
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        Remove-Item -Recurse -Force $p
        Write-Host "    removed $p"
    } else {
        Write-Host "    (already gone) $p"
    }
}

# stale build artefacts (untracked, but tidy up anyway)
Get-ChildItem -Path 'app\dist\assets' -Filter 'MeroSocialRouter-*' -ErrorAction SilentlyContinue |
    Remove-Item -Force
Get-ChildItem -Path 'api\dist\src\database\migrations\core' -Filter '1772000000000-seed-mero-saas-kit-app.*' -ErrorAction SilentlyContinue |
    Remove-Item -Force

Write-Host "==> Staging only the files touched by this chore..." -ForegroundColor Cyan
$toStage = @(
    'api\src\app.module.ts',
    'api\src\database\migrations\core\1772000000000-seed-mero-saas-kit-app.ts',
    'api\src\database\migrations\core\1819000000000-remove-social-and-saas-kit-apps.ts',
    'api\marketplace\shared\mero-social',
    'app\marketplace\shared\mero-social',
    'app\marketplace\shared\mero-saas-kit',
    'app\src\pages\apps\AppViewPage.tsx',
    'app\src\pages\apps\AppsPage.tsx',
    'app\tsconfig.json',
    'app\vite.config.ts',
    'README.md',
    'docs\ARCHITECTURE.md',
    'DEPLOYMENT_GUIDE.md',
    'scripts\cleanup-social-saas-kit.ps1'
)
foreach ($p in $toStage) {
    git add -- $p 2>$null
}

Write-Host "==> Diff summary:" -ForegroundColor Cyan
git diff --staged --stat

Write-Host ""
Write-Host "==> Committing..." -ForegroundColor Cyan
$msg = @"
chore: remove Mero Social and Mero SaaS Kit from product

Both apps were stubs / coming-soon placeholders and are not on the
beta release path. Removed from:

- api/src/app.module.ts (MeroSocialModule import + use)
- api/marketplace/shared/mero-social/ (entire folder)
- app/marketplace/shared/mero-social/ (entire folder)
- app/marketplace/shared/mero-saas-kit/ (entire folder)
- app/src/pages/apps/AppViewPage.tsx (lazy imports + slug branches)
- app/src/pages/apps/AppsPage.tsx (saas-kit "Coming Soon" button)
- app/tsconfig.json (@social path)
- app/vite.config.ts (@social alias)
- README.md, docs/ARCHITECTURE.md, DEPLOYMENT_GUIDE.md (entries removed)

Migrations:
- 1772000000000-seed-mero-saas-kit-app.ts converted to a no-op (kept
  to preserve migration ordering for already-deployed environments)
- 1819000000000-remove-social-and-saas-kit-apps.ts added; idempotently
  removes both rows from the apps table for any DB that ran the old seed
"@
git commit -m $msg

Write-Host ""
Write-Host "==> Done." -ForegroundColor Green
Write-Host "    Push with:  git push -u origin chore/remove-social-saas-kit"
Write-Host "    Then open a PR against develop (or your usual base)."
