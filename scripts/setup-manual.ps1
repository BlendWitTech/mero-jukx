# Mero Jugx - Interactive Manual Setup (PowerShell)
# This script guides you through manual setup WITHOUT Docker
# Users will need to install PostgreSQL and Redis locally

$ErrorActionPreference = "Stop"

Write-Host "Mero Jugx - Interactive Manual Setup" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will guide you through MANUAL setup WITHOUT Docker."
Write-Host "You will need to have PostgreSQL and Redis installed locally."
Write-Host ""

# Function to prompt for input
function Prompt-Input {
    param(
        [string]$Prompt,
        [string]$Default = ""
    )
    
    if ($Default) {
        $result = Read-Host "$Prompt [$Default]"
        if ([string]::IsNullOrWhiteSpace($result)) {
            return $Default
        }
        return $result
    }
    else {
        return Read-Host $Prompt
    }
}

# Function to prompt for yes/no
function Prompt-YesNo {
    param(
        [string]$Prompt,
        [bool]$Default = $false
    )
    
    while ($true) {
        if ($Default) {
            $response = Read-Host "$Prompt [Y/n]"
            if ([string]::IsNullOrWhiteSpace($response)) {
                return $true
            }
        }
        else {
            $response = Read-Host "$Prompt [y/N]"
            if ([string]::IsNullOrWhiteSpace($response)) {
                return $false
            }
        }
        
        switch ($response.ToLower()) {
            { $_ -in "y", "yes" } { return $true }
            { $_ -in "n", "no" } { return $false }
            default { Write-Host "Please answer yes or no." -ForegroundColor Yellow }
        }
    }
}

Write-Host "=== Prerequisites Check ===" -ForegroundColor Blue
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
    
    $nodeMajorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeMajorVersion -lt 18) {
        Write-Host "Node.js version 18+ is required. Current version: $nodeVersion" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm -v
    Write-Host "npm: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "npm is not installed." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check PostgreSQL (local installation required)
Write-Host "Checking PostgreSQL (local installation)..." -ForegroundColor Yellow
$psqlAvailable = $false
try {
    $psqlVersion = psql --version 2>$null
    if ($psqlVersion) {
        Write-Host "PostgreSQL client found: $psqlVersion" -ForegroundColor Green
        $psqlAvailable = $true
    }
}
catch {
    Write-Host "PostgreSQL client not found." -ForegroundColor Yellow
}

if (-not $psqlAvailable) {
    Write-Host ""
    Write-Host "PostgreSQL is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install PostgreSQL 16+:" -ForegroundColor Yellow
    Write-Host "  Windows: Download from https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "  Or use Chocolatey: choco install postgresql16" -ForegroundColor White
    Write-Host ""
    if (-not (Prompt-YesNo "Continue anyway? (You'll need to install PostgreSQL later)" $false)) {
        exit 1
    }
}

# Check if PostgreSQL service is running
Write-Host "Checking if PostgreSQL service is running..." -ForegroundColor Yellow
try {
    $pgService = Get-Service -Name postgresql* -ErrorAction SilentlyContinue
    if ($pgService -and ($pgService.Status -eq "Running")) {
        Write-Host "PostgreSQL service is running" -ForegroundColor Green
    }
    else {
        Write-Host "PostgreSQL service may not be running. Please start it." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Could not check PostgreSQL service status." -ForegroundColor Yellow
}

Write-Host ""

# Check Redis (local installation required)
Write-Host "Checking Redis (local installation)..." -ForegroundColor Yellow
$redisAvailable = $false
try {
    $redisPing = redis-cli ping 2>$null
    if ($redisPing -eq "PONG") {
        Write-Host "Redis is running" -ForegroundColor Green
        $redisAvailable = $true
    }
    elseif ($redisPing) {
        Write-Host "Redis client found but Redis may not be running" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Redis client not found or Redis is not running." -ForegroundColor Yellow
}

if (-not $redisAvailable) {
    Write-Host ""
    Write-Host "Redis is not installed or not running." -ForegroundColor Red
    Write-Host "Please install and start Redis:" -ForegroundColor Yellow
    Write-Host "  Windows: Download from https://github.com/microsoftarchive/redis/releases" -ForegroundColor White
    Write-Host "  Or use Chocolatey: choco install redis-64" -ForegroundColor White
    Write-Host ""
    if (-not (Prompt-YesNo "Continue anyway? (You'll need to install and start Redis later)" $false)) {
        exit 1
    }
}

Write-Host ""
Write-Host "=== Installation ===" -ForegroundColor Blue
Write-Host ""

if (Prompt-YesNo "Install backend dependencies?" $true) {
    Write-Host "Installing backend dependencies..."
    npm install
    Write-Host "Backend dependencies installed" -ForegroundColor Green
}

if (Prompt-YesNo "Install app dependencies?" $true) {
    Write-Host "Installing app dependencies..."
    Set-Location app
    npm install
    Set-Location ..
    Write-Host "App dependencies installed" -ForegroundColor Green
}





Write-Host ""
Write-Host "=== Environment Configuration ===" -ForegroundColor Blue
Write-Host ""

# Create .env file
if (Test-Path .env) {
    if (-not (Prompt-YesNo ".env file exists. Overwrite?" $false)) {
        Write-Host "Keeping existing .env file"
        $skipEnv = $true
    }
}

if (-not $skipEnv) {
    Write-Host "Configuring environment variables..."
    Write-Host ""
    
    # Application settings
    $nodeEnv = Prompt-Input "Node environment (development/production)" "development"
    $port = Prompt-Input "Backend port" "3000"
    $frontendUrl = Prompt-Input "Frontend URL" "http://localhost:3001"
    $appUrl = Prompt-Input "Application URL" "http://localhost:3000"
    
    # Database settings (local PostgreSQL)
    Write-Host ""
    Write-Host "Database Configuration (Local PostgreSQL):"
    Write-Host "Note: You need to create the database manually if it doesn't exist."
    $dbHost = Prompt-Input "Database host" "localhost"
    $dbPort = Prompt-Input "Database port" "5432"
    $dbUser = Prompt-Input "Database user" "postgres"
    $dbPassword = Prompt-Input "Database password" ""
    $dbName = Prompt-Input "Database name" "mero_jugx"
    
    Write-Host ""
    Write-Host "Do you need to create the database? Run this command manually:" -ForegroundColor Yellow
    Write-Host "  psql -U $dbUser -c `"CREATE DATABASE $dbName;`"" -ForegroundColor White
    
    # Redis settings (local Redis)
    Write-Host ""
    Write-Host "Redis Configuration (Local Redis):"
    $redisHost = Prompt-Input "Redis host" "localhost"
    $redisPort = Prompt-Input "Redis port" "6379"
    
    # JWT settings
    Write-Host ""
    Write-Host "JWT Configuration:"
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    $jwtRefreshSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    
    # Email settings
    Write-Host ""
    $configureEmail = Prompt-YesNo "Configure email settings now?" $false
    $smtpHost = ""
    $smtpPort = ""
    $smtpUser = ""
    $smtpPass = ""
    $smtpFrom = ""
    
    if ($configureEmail) {
        $smtpHost = Prompt-Input "SMTP host" ""
        $smtpPort = Prompt-Input "SMTP port" "587"
        $smtpUser = Prompt-Input "SMTP user" ""
        $smtpPass = Prompt-Input "SMTP password" ""
        $smtpFrom = Prompt-Input "From email" ""
    }
    
    # Payment settings
    Write-Host ""
    $configurePayment = Prompt-YesNo "Configure payment gateways now?" $false
    $stripeSecret = ""
    $esewaMerchantId = ""
    
    if ($configurePayment) {
        $stripeSecret = Prompt-Input "Stripe secret key (leave empty to skip)" ""
        $esewaMerchantId = Prompt-Input "eSewa merchant ID (leave empty to skip)" ""
    }
    
    # Set defaults for optional values (PowerShell doesn't support ternary in here-strings)
    if (-not $smtpHost) { $smtpHost = "smtp.gmail.com" }
    if (-not $smtpPort) { $smtpPort = "587" }
    if (-not $smtpUser) { $smtpUser = "" }
    if (-not $smtpPass) { $smtpPass = "" }
    if (-not $smtpFrom) { $smtpFrom = "noreply@mero-jugx.com" }
    if (-not $stripeSecret) { $stripeSecret = "" }
    if (-not $esewaMerchantId) { $esewaMerchantId = "" }
    
    # eSewa test secret key (contains special characters that need escaping)
    $esewa_test_secret = '8gBm/:&EnhH.1/q'
    
    # Generate comprehensive .env file with all defaults
    $envContent = @"
# ============================================
# MERO JUGX - Environment Configuration
# ============================================
# All values below are defaults that allow the project to work

# ============================================
# APPLICATION
# ============================================
NODE_ENV=$nodeEnv
PORT=$port
API_PREFIX=api
API_VERSION=v1
APP_URL=$appUrl
FRONTEND_URL=$frontendUrl

# ============================================
# DATABASE (PostgreSQL - Local Installation)
# ============================================
DB_TYPE=postgres
DB_HOST=$dbHost
DB_PORT=$dbPort
DB_USER=$dbUser
DB_PASSWORD=$dbPassword
DB_NAME=$dbName

# Database Pool Configuration
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000
DB_STATEMENT_TIMEOUT=30000
DB_QUERY_TIMEOUT=30000

# Database Options
DB_SYNCHRONIZE=false
DB_LOGGING=true

# ============================================
# REDIS (Local Installation)
# ============================================
REDIS_HOST=$redisHost
REDIS_PORT=$redisPort
REDIS_PASSWORD=

# ============================================
# JWT AUTHENTICATION
# ============================================
# IMPORTANT: These are auto-generated. Change in production!
JWT_SECRET=$jwtSecret
JWT_REFRESH_SECRET=$jwtRefreshSecret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# EMAIL CONFIGURATION
# ============================================
# Option 1: Resend API (Recommended for development)
RESEND_API_KEY=

# Option 2: SMTP (Alternative)
SMTP_HOST=$smtpHost
SMTP_PORT=$smtpPort
SMTP_SECURE=false
SMTP_USER=$smtpUser
SMTP_PASSWORD=$smtpPass
SMTP_FROM=$smtpFrom
SMTP_FROM_NAME=Mero Jugx

# ============================================
# TWO-FACTOR AUTHENTICATION (2FA/MFA)
# ============================================
TOTP_ISSUER=Mero Jugx
TOTP_ALGORITHM=SHA1
TOTP_DIGITS=6
TOTP_PERIOD=30

# ============================================
# RATE LIMITING
# ============================================
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# ============================================
# FILE UPLOAD
# ============================================
MAX_FILE_SIZE=5242880
UPLOAD_DEST=./uploads

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=debug
LOG_DIR=./logs

# ============================================
# SENTRY ERROR TRACKING (Optional)
# ============================================
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILES_SAMPLE_RATE=1.0

# ============================================
# CACHING
# ============================================
CACHE_TTL=3600

# ============================================
# PAYMENT GATEWAYS
# ============================================

# eSewa Payment Gateway (Test credentials - works out of the box)
ESEWA_TEST_MERCHANT_ID=EPAYTEST
ESEWA_TEST_SECRET_KEY=$esewa_test_secret
ESEWA_TEST_API_URL=https://rc-epay.esewa.com.np/api/epay/main/v2/form
ESEWA_TEST_VERIFY_URL=https://rc.esewa.com.np/api/epay/transaction/status
ESEWA_MERCHANT_ID=$esewaMerchantId
ESEWA_SECRET_KEY=
ESEWA_API_URL=https://epay.esewa.com.np/api/epay/main/v2/form
ESEWA_VERIFY_URL=https://esewa.com.np/api/epay/transaction/status
ESEWA_USE_MOCK_MODE=false

# Stripe Payment Gateway
STRIPE_TEST_PUBLISHABLE_KEY=
STRIPE_TEST_SECRET_KEY=$stripeSecret
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ============================================
# CURRENCY CONFIGURATION
# ============================================
NPR_TO_USD_RATE=0.0075
DEFAULT_CURRENCY=NPR
NEPAL_COUNTRY_CODE=NP

# ============================================
# SMS SERVICE (Twilio - Optional)
# ============================================
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# ============================================
# PUSH NOTIFICATIONS (Firebase - Optional)
# ============================================
FIREBASE_SERVER_KEY=
"@
    
    Set-Content -Path .env -Value $envContent
    Write-Host ".env file created with all defaults" -ForegroundColor Green
}

# Create app/.env
if (-not (Test-Path app/.env)) {
    $apiUrl = "http://localhost:3000/api/v1"
    if (Test-Path .env) {
        $appUrlLine = Get-Content .env | Select-String "APP_URL"
        if ($appUrlLine) {
            $appUrl = ($appUrlLine -split '=')[1].Trim()
            $apiUrl = "$appUrl/api/v1"
        }
    }
    
    $frontendEnvContent = @"
# ============================================
# MERO JUGX - Frontend Environment Configuration
# ============================================
# All values below are defaults that allow the project to work

# API Configuration
VITE_API_URL=$apiUrl

# Application
VITE_APP_NAME=Mero Jugx
VITE_APP_VERSION=1.0.0

# Sentry Error Tracking (Optional)
VITE_SENTRY_DSN=
VITE_SENTRY_TRACES_SAMPLE_RATE=1.0

# Currency Configuration
VITE_NPR_TO_USD_RATE=0.0075
VITE_DEFAULT_CURRENCY=NPR
"@
    Set-Content -Path app/.env -Value $frontendEnvContent
    Write-Host "app/.env file created with all defaults" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Build ===" -ForegroundColor Blue
Write-Host ""

if (Prompt-YesNo "Build backend?" $true) {
    Write-Host "Building backend..."
    try {
        npm run build
        Write-Host "Backend built successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Build failed" -ForegroundColor Yellow
    }
}

if (Prompt-YesNo "Build app?" $true) {
    Write-Host "Building app..."
    Set-Location app
    try {
        npm run build
        Write-Host "App built successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Build failed" -ForegroundColor Yellow
    }
    Set-Location ..
}

Write-Host ""
Write-Host "=== Database Setup ===" -ForegroundColor Blue
Write-Host ""

if ($psqlAvailable) {
    if (Prompt-YesNo "Initialize database (run migrations and seeds)?" $false) {
        Write-Host "Initializing database..."
        try {
            npm run db:init
            Write-Host "Database initialized" -ForegroundColor Green
        }
        catch {
            Write-Host "Database initialization failed" -ForegroundColor Yellow
            Write-Host "Make sure PostgreSQL is running and the database exists." -ForegroundColor Yellow
        }
    }
}
else {
    Write-Host "PostgreSQL is not available. Skipping database initialization." -ForegroundColor Yellow
    Write-Host "After installing PostgreSQL, create the database and run 'npm run db:init'" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Manual setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Blue
Write-Host "1. Make sure PostgreSQL is installed and running" -ForegroundColor White
Write-Host "2. Make sure Redis is installed and running" -ForegroundColor White
Write-Host "3. Create the database if you haven't already:" -ForegroundColor White
Write-Host "   psql -U postgres -c `"CREATE DATABASE $dbName;`"" -ForegroundColor Gray
Write-Host "4. Review your .env file" -ForegroundColor White
Write-Host "5. Initialize database: npm run db:init" -ForegroundColor White
Write-Host "   This will run migrations and seed base data (packages, permissions, roles, etc.)" -ForegroundColor Gray
Write-Host "6. Start development servers: npm run dev" -ForegroundColor White
Write-Host "7. Visit http://localhost:3001 to access the application" -ForegroundColor White
Write-Host ""
Write-Host "Note: This setup uses LOCAL PostgreSQL and Redis, NOT Docker." -ForegroundColor Yellow
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green
