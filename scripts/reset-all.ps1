# Mero Jugx - Complete Reset Script (PowerShell)
# This script removes EVERYTHING and prepares for fresh setup
# WARNING: This will DELETE ALL DATA, node_modules, builds, database tables, and .env files

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR

Set-Location $PROJECT_ROOT

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Mero Jugx - Complete Reset Script                         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will DELETE EVERYTHING!" -ForegroundColor Red
Write-Host ""
Write-Host "This script will:"
Write-Host "  ✗ Remove ALL node_modules (root, api, app, and all microservices)"
Write-Host "  ✗ Remove all dist/build folders"
Write-Host "  ✗ Drop ALL database tables and data (including all chats, tickets, users, organizations)"
Write-Host "  ✗ Remove .env files"
Write-Host "  ✗ Clear npm cache"
Write-Host "  ✗ Clear logs"
Write-Host "  ✗ Clear uploads"
Write-Host "  ✗ Stop Docker containers and REMOVE all project volumes (PostgreSQL data, Redis data)"
Write-Host ""
Write-Host "After reset, you need to:"
Write-Host "  1. Run 'npm run setup' — installs all dependencies + starts Docker containers fresh"
Write-Host "  2. Run 'npm run db:init' to initialize database (create tables and seed data)"
Write-Host ""
Write-Host "  ⚠  Docker volumes will be deleted. 'npm run setup' will recreate them automatically." -ForegroundColor Yellow
Write-Host "  ⚠  You do NOT need to manually manage Docker after this reset." -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "Are you absolutely sure? Type 'RESET' to continue"
if ($response -ne "RESET") {
    Write-Host "Reset cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Starting complete reset..." -ForegroundColor Green
Write-Host ""

# Step 1: Docker Cleanup (Stop containers and remove volumes)
Write-Host "[1/8] Cleaning up Docker environment..." -ForegroundColor Cyan
try {
    $hasDockerCompose = $false
    try { $hasDockerCompose = $null -ne (docker-compose --version 2>$null) } catch {}
    
    $hasDocker = $false
    try { $hasDocker = $null -ne (docker --version 2>$null) } catch {}

    $dockerCleanupSuccess = $false

    if ($hasDockerCompose -or $hasDocker) {
        Write-Host "  Stopping and removing all project containers..." -ForegroundColor Gray
        docker ps -a --format "{{.Names}}" | Where-Object { $_ -like "*mero*" } | ForEach-Object {
            docker rm -f $_ 2>$null | Out-Null
        }
        
        Write-Host "  Removing volumes via docker-compose..." -ForegroundColor Gray
        docker-compose down -v 2>&1 | Out-Null
        $dockerCleanupSuccess = ($LASTEXITCODE -eq 0)
    }
    else {
        Write-Host "  ⚠ Docker not found (checked docker-compose and docker). Skipping Docker cleanup." -ForegroundColor Yellow
    }

    if ($dockerCleanupSuccess -or $hasDocker -or $hasDockerCompose) {
        # Targeted volume removal based on known naming variations (just in case)
        Write-Host "  Ensuring targeted volume removal..." -ForegroundColor Gray
        $targetVolumes = @(
            "mero_jugx_postgres_data", "mero_jugx_redis_data",
            "merojugx_postgres_data", "merojugx_redis_data",
            "mero-jugx_postgres_data", "mero-jugx_redis_data",
            "merojugx_pgdata", "merojugx_db_data",
            "mero-jugx-mongo-data", "mero-jugx-postgres-data"
        )
        
        foreach ($vol in $targetVolumes) {
            docker volume rm $vol 2>$null | Out-Null
        }

        # Also remove anything else containing "mero" just to be sure
        $allMeroVolumes = docker volume ls --format "{{.Name}}" | Where-Object { $_ -like "*mero*" }
        if ($allMeroVolumes) {
            Write-Host "  Removing residual mero-related volumes..." -ForegroundColor Gray
            foreach ($vol in $allMeroVolumes) {
                docker volume rm $vol -f 2>$null | Out-Null
            }
        }
        Write-Host "  ✓ Docker containers stopped and all project volumes removed" -ForegroundColor Green
    }
}
catch {
    Write-Host "  ⚠ Error during Docker cleanup: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  (This is OK if you are not using Docker or it is already stopped)" -ForegroundColor Gray
}
Write-Host ""

# Step 2: Remove node_modules (with retry for locked files)
Write-Host "[2/8] Removing node_modules..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    # Try to remove, if fails due to locked files, use robocopy trick
    try {
        Remove-Item -Recurse -Force "node_modules" -ErrorAction Stop
        Write-Host "  ✓ Backend node_modules removed" -ForegroundColor Green
    }
    catch {
        Write-Host "  ⚠ Some files are locked, using alternative method..." -ForegroundColor Yellow
        # Use robocopy to delete by mirroring empty directory
        $emptyDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
        robocopy $emptyDir "node_modules" /MIR /R:0 /W:0 | Out-Null
        Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item $emptyDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Backend node_modules removed" -ForegroundColor Green
    }
}
if (Test-Path "app/node_modules") {
    try {
        Remove-Item -Recurse -Force "app/node_modules" -ErrorAction Stop
        Write-Host "  ✓ Frontend (app) node_modules removed" -ForegroundColor Green
    }
    catch {
        Write-Host "  ⚠ Some files are locked, using alternative method..." -ForegroundColor Yellow
        $emptyDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
        robocopy $emptyDir "app/node_modules" /MIR /R:0 /W:0 | Out-Null
        Remove-Item "app/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item $emptyDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ Frontend (app) node_modules removed" -ForegroundColor Green
    }
}
# Clean api/ node_modules if exists
if (Test-Path "api/node_modules") {
    try {
        Remove-Item -Recurse -Force "api/node_modules" -ErrorAction Stop
        Write-Host "  ✓ API node_modules removed" -ForegroundColor Green
    }
    catch {
        Write-Host "  ⚠ Some files are locked, using alternative method..." -ForegroundColor Yellow
        $emptyDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
        robocopy $emptyDir "api/node_modules" /MIR /R:0 /W:0 | Out-Null
        Remove-Item "api/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item $emptyDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✓ API node_modules removed" -ForegroundColor Green
    }
}
# Clean all microservice node_modules inside app/marketplace and api/marketplace
$microsvcDirs = @("app/marketplace", "api/marketplace")
foreach ($dir in $microsvcDirs) {
    if (Test-Path $dir) {
        $microMods = Get-ChildItem -Path $dir -Recurse -Filter "node_modules" -Directory -ErrorAction SilentlyContinue
        foreach ($mod in $microMods) {
            Write-Host "  Removing microservice node_modules: $($mod.FullName.Replace($PROJECT_ROOT + [IO.Path]::DirectorySeparatorChar, ''))..." -ForegroundColor Gray
            Remove-Item -Recurse -Force $mod.FullName -ErrorAction SilentlyContinue
        }
        if ($microMods.Count -gt 0) {
            Write-Host "  ✓ Microservice node_modules removed ($($microMods.Count) found)" -ForegroundColor Green
        }
    }
}
# Clean packages/ if exists
if (Test-Path "packages") {
    $packageModules = Get-ChildItem -Path "packages" -Recurse -Filter "node_modules" -Directory
    foreach ($mod in $packageModules) {
        Write-Host "  Removing node_modules for $($mod.Parent.Name)..."
        Remove-Item -Recurse -Force $mod.FullName -ErrorAction SilentlyContinue
    }
}
Write-Host ""

# Step 3: Remove build artifacts
Write-Host "[3/8] Removing build artifacts..." -ForegroundColor Cyan
@("api/dist", "app/dist", "shared/dist", "packages/*/dist", "coverage", "app/coverage") | ForEach-Object {
    if (Test-Path $_) {
        Remove-Item -Recurse -Force $_
        Write-Host "  ✓ $_ removed" -ForegroundColor Green
    }
}
Write-Host ""

# Step 4: Clear logs
Write-Host "[4/8] Clearing logs..." -ForegroundColor Cyan
if (Test-Path "logs") {
    Get-ChildItem "logs" -File | Remove-Item -Force
    Write-Host "  ✓ Logs cleared" -ForegroundColor Green
}
@("error-log.txt", "startup-log.txt", "frontend-errors.log", "db_error.txt", "db_init_debug.log", "db_init_final.log", "db_init_output.txt", "docker_ps.txt", "docker_vols.txt", "final_error.log", "error_extract.txt") | ForEach-Object {
    if (Test-Path $_) {
        Remove-Item -Force $_
        Write-Host "  ✓ $_ removed" -ForegroundColor Green
    }
}
Write-Host ""

# Step 5: Clear cache
Write-Host "[5/8] Clearing npm cache..." -ForegroundColor Cyan
$ErrorActionPreference = "SilentlyContinue"
npm cache clean --force *>$null
Set-Location app
npm cache clean --force *>$null
Set-Location ..
$ErrorActionPreference = "Stop"
Write-Host "  ✓ Cache cleared" -ForegroundColor Green
Write-Host ""

# Step 6: Reset database (drop tables in current DB if exists)
Write-Host "[6/8] Resetting database..." -ForegroundColor Cyan
Write-Host "  This will:" -ForegroundColor Gray
Write-Host "    - Drop ALL tables and data (including all chats, tickets, users, organizations, etc.)" -ForegroundColor Gray
Write-Host "    - Make the database completely empty" -ForegroundColor Gray
Write-Host "    - Recreate tables and seed base data" -ForegroundColor Gray
if (Test-Path ".env") {
    try {
        Write-Host "  Running database reset..." -ForegroundColor Gray
        $ErrorActionPreference = "Continue"
        npm run db:reset 2>&1 | Out-Null
        $ErrorActionPreference = "Stop"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Database reset completed (all tables dropped and recreated with base data)" -ForegroundColor Green
        }
        else {
            Write-Host "  ⚠ Database reset failed. You may need to run it manually after setup." -ForegroundColor Yellow
            Write-Host "  ⚠ Run 'npm run db:reset' after setup to reset database." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  ⚠ Database reset failed: $_" -ForegroundColor Yellow
        Write-Host "  ⚠ Run 'npm run db:reset' after setup to reset database." -ForegroundColor Yellow
    }
}
else {
    Write-Host "  ⚠ .env file not found. Database will be reset after setup." -ForegroundColor Yellow
    Write-Host "  ⚠ After setup, run 'npm run db:reset' to reset database." -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Remove environment files
Write-Host "[7/8] Removing environment files..." -ForegroundColor Cyan
@(".env", ".env.local", ".env.production", "app/.env", "app/.env.local", "app/.env.production", "api/.env", "api/.env.local") | ForEach-Object {
    if (Test-Path $_) {
        try {
            Remove-Item -Force $_ -ErrorAction Stop
            Write-Host "  ✓ $_ removed" -ForegroundColor Green
        }
        catch {
            # Try to unlock and remove
            Write-Host "  ⚠ $_ is locked, attempting to force..." -ForegroundColor Yellow
            $null = cmd /c "del /F /Q `"$($_)`"" 2>$null
            if (Test-Path $_) {
                Write-Host "  ⚠ Failed to remove $_. It may be in use by another process." -ForegroundColor Red
            }
            else {
                Write-Host "  ✓ $_ removed (forced)" -ForegroundColor Green
            }
        }
    }
}
Write-Host ""

# Step 8: Clear uploads (keep .gitkeep if exists)
Write-Host "[8/8] Clearing uploaded files..." -ForegroundColor Cyan
if (Test-Path "uploads") {
    Get-ChildItem "uploads" -Recurse -File | Where-Object { $_.Name -ne ".gitkeep" } | Remove-Item -Force
    Write-Host "  ✓ Uploaded files cleared" -ForegroundColor Green
}
Write-Host ""

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Reset Complete!                                            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Everything has been reset." -ForegroundColor Green
Write-Host ""
Write-Host "What was removed:" -ForegroundColor Cyan
Write-Host "  ✓ ALL node_modules (root, api, app, and microservices)" -ForegroundColor Gray
Write-Host "  ✓ All dist/build folders" -ForegroundColor Gray
Write-Host "  ✓ Docker containers stopped + project volumes deleted (PostgreSQL & Redis data gone)" -ForegroundColor Gray
Write-Host "  ✓ .env files" -ForegroundColor Gray
Write-Host "  ✓ Logs, cache, uploads" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run 'npm run setup'" -ForegroundColor White
Write-Host "     → Reinstalls ALL dependencies (root + api + app + microservices)" -ForegroundColor Gray
Write-Host "     → Creates fresh .env files" -ForegroundColor Gray
Write-Host "     → Starts Docker containers (PostgreSQL + Redis) — no manual Docker needed" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Run 'npm run db:init'" -ForegroundColor White
Write-Host "     → Creates all tables and seeds base data" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Run 'npm run start' to start development servers" -ForegroundColor White
Write-Host ""
Write-Host "⚠  NOTE: Because ALL node_modules were deleted, 'npm run setup' will take" -ForegroundColor Yellow
Write-Host "   several minutes to reinstall all packages. This is expected." -ForegroundColor Yellow
Write-Host ""
Write-Host "Ready to start fresh! 🚀" -ForegroundColor Green
Write-Host ""
