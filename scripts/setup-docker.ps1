# Mero Jugx - Docker Setup Script (PowerShell)
# Sets up Docker containers for PostgreSQL and Redis, and installs dependencies

$ErrorActionPreference = "Stop"

Write-Host "Mero Jugx - Docker Setup" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "Docker found: $dockerVersion" -ForegroundColor Green
    }
    else {
        Write-Host "Docker is not installed or not in PATH." -ForegroundColor Red
        Write-Host "Please install Docker Desktop:" -ForegroundColor Yellow
        Write-Host "  Windows: https://www.docker.com/products/docker-desktop" -ForegroundColor White
        exit 1
    }
}
catch {
    Write-Host "Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Blue
if ((Test-Path "node_modules") -and (Test-Path "app/node_modules")) {
    Write-Host "  Dependencies already installed, skipping..." -ForegroundColor Gray
}
else {
    Write-Host "  Installing backend dependencies..." -ForegroundColor White
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install backend dependencies." -ForegroundColor Red
        exit 1
    }
    Write-Host "  Backend dependencies installed" -ForegroundColor Green
    
    Write-Host "  Installing frontend dependencies..." -ForegroundColor White
    Set-Location app
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install app dependencies." -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "  App dependencies installed" -ForegroundColor Green
    
    Write-Host "  Installing system-admin backend dependencies..." -ForegroundColor White
    if (Test-Path "apps/system-admin/backend") {
        Set-Location apps/system-admin/backend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install system-admin backend dependencies." -ForegroundColor Red
            Set-Location ../../..
            exit 1
        }
        Set-Location ../../..
        Write-Host "  System-admin backend dependencies installed" -ForegroundColor Green
    }
    
    Write-Host "  Installing system-admin frontend dependencies..." -ForegroundColor White
    if (Test-Path "apps/system-admin/frontend") {
        Set-Location apps/system-admin/frontend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install system-admin frontend dependencies." -ForegroundColor Red
            Set-Location ../../..
            exit 1
        }
        Set-Location ../../..
        Write-Host "  System-admin frontend dependencies installed" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Step 2: Setting up environment files..." -ForegroundColor Blue
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$SCRIPT_DIR\create-env.ps1"

Write-Host ""
Write-Host "Step 3: Starting Docker containers (PostgreSQL and Redis)..." -ForegroundColor Blue

# Check if volumes already exist (project prefix might be mero_jugx or mero-jugx or merojugx)
$existingVolumes = docker volume ls --format "{{.Name}}" | Where-Object { $_ -match "mero.*_postgres_data|mero.*_pgdata" }
if ($existingVolumes) {
    Write-Host "  ⚠ WARNING: Existing database volumes found ($($existingVolumes -join ', '))" -ForegroundColor Yellow
    Write-Host "  If you want a COMPLETELY FRESH setup, you should run 'npm run reset' first." -ForegroundColor Yellow
    $resetChoice = Read-Host "  Do you want to continue with existing data (this might cause errors)? (y/n) [default: y]"
    if ($resetChoice -eq "n" -or $resetChoice -eq "N") {
        Write-Host "  Setup aborted. Please run 'npm run reset' to clear data." -ForegroundColor Yellow
        exit 0
    }
}

docker-compose up -d postgres redis
if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker containers started" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting for containers to be ready..." -ForegroundColor Blue
    Start-Sleep -Seconds 5
    Write-Host ""
    Write-Host "Docker setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Docker containers are running:" -ForegroundColor White
    Write-Host "  - PostgreSQL: localhost:5433" -ForegroundColor White
    Write-Host "  - Redis: localhost:6380" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Initialize database: npm run db:init" -ForegroundColor White
    Write-Host "     This will run migrations and seed base data" -ForegroundColor Gray
    Write-Host "  2. Start development servers: npm run start:dev" -ForegroundColor White
}
else {
    Write-Host "Docker setup failed. Make sure Docker is running." -ForegroundColor Red
    exit 1
}

