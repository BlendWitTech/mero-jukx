# Mero Jugx - Reset Database Only (PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "Mero Jugx - Reset Database" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "WARNING: This will DELETE ALL DATABASE DATA!" -ForegroundColor Red
Write-Host ""

$response = Read-Host "Are you absolutely sure? Type 'yes' to continue"
if ($response -ne "yes") {
    Write-Host "Database reset cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Resetting database..." -ForegroundColor Blue

if (-not (Test-Path .env)) {
    Write-Host ""
    Write-Host "ERROR: .env file not found. Please create one first." -ForegroundColor Red
    exit 1
}

Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Drop ALL tables and data (including all chats, tickets, users, organizations, etc.)" -ForegroundColor White
Write-Host "  2. Make the database completely empty" -ForegroundColor White
Write-Host ""
Write-Host "Note: Run 'npm run db:init' after this to recreate tables and seed data." -ForegroundColor Cyan
Write-Host ""

# Load environment variables
Get-Content ".env" | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$DB_HOST = $env:DB_HOST
$DB_PORT = $env:DB_PORT
$DB_USER = $env:DB_USER
$DB_PASSWORD = $env:DB_PASSWORD
$DB_NAME = $env:DB_NAME

if (-not $DB_NAME) {
    Write-Host "ERROR: Database configuration not found in .env file." -ForegroundColor Red
    exit 1
}

# Check if psql is available (local or via Docker)
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
$useDocker = $false
$dockerContainer = $null

if (-not $psqlPath) {
    # Try to use Docker
    $hasDocker = $false
    try { $hasDocker = $null -ne (docker --version 2>$null) } catch {}
    
    if ($hasDocker) {
        # Check if postgres container is running
        $containers = docker ps --filter "name=postgres" --format "{{.Names}}" 2>$null
        if ($containers) {
            $dockerContainer = ($containers | Select-Object -First 1)
            $useDocker = $true
            Write-Host "  Using Docker container: $dockerContainer" -ForegroundColor Gray
        }
    }
    
    if (-not $useDocker) {
        Write-Host ""
        Write-Host "ERROR: psql command not found and Docker PostgreSQL container is not running." -ForegroundColor Red
        Write-Host ""
        Write-Host "  Options:" -ForegroundColor Yellow
        Write-Host "  1. Install PostgreSQL client tools:" -ForegroundColor White
        Write-Host "     Windows: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
        Write-Host "     Or: choco install postgresql16" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  2. Start Docker PostgreSQL container:" -ForegroundColor White
        Write-Host "     docker-compose up -d postgres" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  3. Use TypeScript reset script (recommended, no psql needed):" -ForegroundColor White
        Write-Host "     npm run db:reset" -ForegroundColor Gray
        exit 1
    }
}

Write-Host "Dropping all database tables and data..." -ForegroundColor Blue
Write-Host "  Connecting to: ${DB_HOST}:${DB_PORT}/${DB_NAME}" -ForegroundColor Gray

$env:PGPASSWORD = $DB_PASSWORD

# Test connection first
if ($useDocker) {
    $testConnection = "SELECT 1;" | docker exec -i $dockerContainer psql -U $DB_USER -d $DB_NAME -t -q 2>&1
}
else {
    $testConnection = "SELECT 1;" | & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -q 2>&1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Cannot connect to database!" -ForegroundColor Red
    Write-Host "  Error: $testConnection" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Please check:" -ForegroundColor Yellow
    Write-Host "    - Database is running (Docker: docker-compose up -d postgres)" -ForegroundColor White
    Write-Host "    - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env are correct" -ForegroundColor White
    Write-Host "    - Database exists: CREATE DATABASE ${DB_NAME};" -ForegroundColor White
    Write-Host ""
    Write-Host "  Alternatively, use TypeScript reset script:" -ForegroundColor Yellow
    Write-Host "    npm run db:reset" -ForegroundColor White
    exit 1
}

# Drop all tables, constraints, and types
$dropScript = "DO `$`$ DECLARE`n" +
"    r RECORD;`n" +
"BEGIN`n" +
"    -- Drop all foreign key constraints first (ignore errors if constraint doesn't exist)`n" +
"    FOR r IN (SELECT conname, conrelid::regclass FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace)`n" +
"    LOOP`n" +
"        BEGIN`n" +
"            EXECUTE 'ALTER TABLE ' || r.conrelid || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE';`n" +
"        EXCEPTION WHEN OTHERS THEN`n" +
"            -- Ignore errors for constraints that don't exist`n" +
"            NULL;`n" +
"        END;`n" +
"    END LOOP;`n" +
"    `n" +
"    -- Drop all tables`n" +
"    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')`n" +
"    LOOP`n" +
"        BEGIN`n" +
"            EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';`n" +
"        EXCEPTION WHEN OTHERS THEN`n" +
"            -- Ignore errors`n" +
"            NULL;`n" +
"        END;`n" +
"    END LOOP;`n" +
"    `n" +
"    -- Drop all types (enums)`n" +
"    FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))`n" +
"    LOOP`n" +
"        BEGIN`n" +
"            EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';`n" +
"        EXCEPTION WHEN OTHERS THEN`n" +
"            -- Ignore errors`n" +
"            NULL;`n" +
"        END;`n" +
"    END LOOP;`n" +
"END `$`$;"

if ($useDocker) {
    $output = $dropScript | docker exec -i $dockerContainer psql -U $DB_USER -d $DB_NAME -q 2>&1
}
else {
    $output = $dropScript | & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -q 2>&1
}
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS: Database reset completed successfully!" -ForegroundColor Green
    Write-Host "  - All tables and data have been dropped" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next step: Run 'npm run db:init' to recreate tables and seed data." -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "ERROR: Database reset failed!" -ForegroundColor Red
    if ($output) {
        Write-Host "  Error: $output" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "  You can try using the TypeScript reset script instead:" -ForegroundColor Yellow
    Write-Host "  npm run db:reset" -ForegroundColor White
    exit 1
}
