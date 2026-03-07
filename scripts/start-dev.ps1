# Mero Jugx - Start Development Servers (PowerShell)

$ErrorActionPreference = "Continue"

Write-Host "Mero Jugx - Starting Development Servers" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "WARNING: .env file not found!" -ForegroundColor Yellow
    Write-Host "Please create a .env file with your configuration." -ForegroundColor Yellow
    Write-Host "Run 'npm run setup' first if you haven't set up the project." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if ports are already in use (check for listening state)
$backendPort = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
$frontendPort = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if ($backendPort -and $frontendPort) {
    Write-Host "WARNING: Both servers are already running!" -ForegroundColor Yellow
    $backendPid = $backendPort.OwningProcess
    $frontendPid = $frontendPort.OwningProcess
    Write-Host "  - Backend is running on port 3000 (PID: $backendPid)" -ForegroundColor Yellow
    Write-Host "  - Frontend is running on port 3001 (PID: $frontendPid)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Both servers are already running. Exiting." -ForegroundColor Green
    Write-Host "To stop them, close the server windows or run:" -ForegroundColor White
    Write-Host "  Get-NetTCPConnection -LocalPort 3000,3001 -State Listen | ForEach-Object { Stop-Process -Id `$_.OwningProcess -Force }" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

# Skip starting individual servers that are already running
if ($backendPort) {
    $backendPid = $backendPort.OwningProcess
    Write-Host "  - Backend already running on port 3000 (PID: $backendPid), skipping..." -ForegroundColor Yellow
}
if ($frontendPort) {
    $frontendPid = $frontendPort.OwningProcess
    Write-Host "  - Frontend already running on port 3001 (PID: $frontendPid), skipping..." -ForegroundColor Yellow
}

# Check if Docker Compose file exists and start containers (only postgres and redis)
if (Test-Path "docker-compose.yml") {
    Write-Host "[0/2] Starting Docker containers (PostgreSQL, Redis)..." -ForegroundColor Blue
    
    # Check if Docker is running
    $dockerInfo = docker info 2>$null
    if (-not $dockerInfo) {
        Write-Host "" -ForegroundColor Red
        Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
        Write-Host "║  ERROR: Docker Desktop is NOT running!                       ║" -ForegroundColor Red
        Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Red
        Write-Host "" -ForegroundColor Yellow
        Write-Host "The application requires PostgreSQL and Redis in Docker." -ForegroundColor Yellow
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }

    docker-compose up -d postgres redis 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker containers started successfully" -ForegroundColor Green
    }
    else {
        Write-Host "WARNING: Docker Compose failed. This might be because containers are already starting." -ForegroundColor Yellow
    }
    Write-Host ""
    Start-Sleep -Seconds 3
}

# Check if database is initialized
Write-Host "Checking database initialization..." -ForegroundColor Cyan
npm run db:check 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  WARNING: Database is NOT initialized!                     ║" -ForegroundColor Yellow
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The database tables have not been created yet." -ForegroundColor Yellow
    Write-Host "This will cause 'relation does not exist' errors when the app starts." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To initialize the database, run:" -ForegroundColor White
    Write-Host "  npm run db:init" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This will:" -ForegroundColor Gray
    Write-Host "  • Run all database migrations (create tables)" -ForegroundColor Gray
    Write-Host "  • Seed the database with initial data" -ForegroundColor Gray
    Write-Host ""
    
    $response = Read-Host "Do you want to continue starting the servers anyway? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host ""
        Write-Host "Startup cancelled. Please run 'npm run db:init' first." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    Write-Host ""
    Write-Host "Continuing with uninitialized database..." -ForegroundColor Yellow
    Write-Host "Note: You may see database errors until you run 'npm run db:init'" -ForegroundColor Yellow
    Write-Host ""
}
else {
    Write-Host "✓ Database is initialized" -ForegroundColor Green
    Write-Host ""
}

Write-Host "[1/4] Starting backend server (port 3000)..." -ForegroundColor Blue
if ($backendPort) {
    Write-Host "  ✓ Backend already running, skipping." -ForegroundColor Green
    $backendWindow = $null
}
else {
    $backendWindow = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\api'; `$Host.UI.RawUI.WindowTitle = 'Mero Jugx - Backend (Port 3000)'; Write-Host 'Mero Jugx - Backend Server' -ForegroundColor Cyan; Write-Host 'Port: 3000' -ForegroundColor White; Write-Host ''; npm run dev:backend" -PassThru
    Start-Sleep -Seconds 3
}

Write-Host "[2/4] Starting app server (port 3001)..." -ForegroundColor Blue
if ($frontendPort) {
    Write-Host "  ✓ Frontend already running, skipping." -ForegroundColor Green
    $frontendWindow = $null
}
else {
    $frontendWindow = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\app'; `$Host.UI.RawUI.WindowTitle = 'Mero Jugx - App (Port 3001)'; Write-Host 'Mero Jugx - App Server' -ForegroundColor Cyan; Write-Host 'Port: 3001' -ForegroundColor White; Write-Host ''; npm run dev" -PassThru
    Start-Sleep -Seconds 2
}

Start-Sleep -Seconds 2

# Note: All components are currently in api/ and app/


# Verify servers started
$backendCheck = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Development Servers Running!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
if (Test-Path "docker-compose.yml") {
    Write-Host "Docker:   PostgreSQL and Redis running" -ForegroundColor White
    Write-Host ""
}
Write-Host "Main App:" -ForegroundColor White
if ($backendCheck) {
    Write-Host "  Backend:  http://localhost:3000" -ForegroundColor Green
}
else {
    Write-Host "  Backend:  Starting... (check the backend window)" -ForegroundColor Yellow
}
if ($frontendCheck) {
    Write-Host "  Frontend: http://localhost:3001" -ForegroundColor Green
}
else {
    Write-Host "  Frontend: Starting... (check the frontend window)" -ForegroundColor Yellow
}
Write-Host "  API Docs: http://localhost:3000/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servers are running in separate windows:" -ForegroundColor Yellow
Write-Host "  - 'Mero Jugx - Backend (Port 3000)'" -ForegroundColor White
Write-Host "  - 'Mero Jugx - Frontend (Port 3001)'" -ForegroundColor White
if ($systemAdminBackendWindow) {
    Write-Host "  - 'System Admin - Backend (Port 3002)'" -ForegroundColor White
}
if ($systemAdminFrontendWindow) {
    Write-Host "  - 'System Admin - Frontend (Port 3003)'" -ForegroundColor White
}
Write-Host ""
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to exit this script (servers will continue running)..." -ForegroundColor Yellow
Write-Host ""

# Wait for interrupt signal
try {
    while ($true) {
        Start-Sleep -Seconds 1
        # Check if windows are still open
        $windowsClosed = ($backendWindow -and $backendWindow.HasExited) -or ($frontendWindow -and $frontendWindow.HasExited)
        if ($systemAdminBackendWindow) {
            $windowsClosed = $windowsClosed -or $systemAdminBackendWindow.HasExited
        }
        if ($systemAdminFrontendWindow) {
            $windowsClosed = $windowsClosed -or $systemAdminFrontendWindow.HasExited
        }
        if ($windowsClosed) {
            Write-Host ""
            Write-Host "One or more server windows were closed." -ForegroundColor Yellow
            break
        }
    }
}
catch {
    # User pressed Ctrl+C
    Write-Host ""
    Write-Host "Monitoring stopped. Servers are still running in their windows." -ForegroundColor Yellow
    Write-Host "Close the server windows to stop them." -ForegroundColor Yellow
}
