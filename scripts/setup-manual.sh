#!/bin/bash

# Mero Jugx - Interactive Manual Setup
# This script guides you through manual setup with prompts

set -e

echo "🚀 Mero Jugx - Interactive Manual Setup"
echo "======================================="
echo ""
echo "This script will guide you through setting up Mero Jugx step by step."
echo ""
echo "If you get stuck, see the README.md and Developer_Guide.md for troubleshooting."
echo "For Docker setup, use scripts/setup-docker.sh."
echo "For a full reset, use scripts/reset-all.sh."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to prompt for input
prompt_input() {
    local prompt=$1
    local default=$2
    local result
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " result
        echo "${result:-$default}"
    else
        read -p "$prompt: " result
        echo "$result"
    fi
}

# Function to prompt for yes/no
prompt_yesno() {
    local prompt=$1
    local default=$2
    local result
    
    while true; do
        if [ "$default" = "y" ]; then
            read -p "$prompt [Y/n]: " result
            result=${result:-y}
        else
            read -p "$prompt [y/N]: " result
            result=${result:-n}
        fi
        
        case $result in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

echo -e "${BLUE}=== Prerequisites Check ===${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm: $(npm -v)${NC}"
echo ""

# Check PostgreSQL (local installation required)
echo "Checking PostgreSQL (local installation)..."
PSQL_AVAILABLE=false
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version 2>/dev/null)
    if [ -n "$PSQL_VERSION" ]; then
        echo -e "${GREEN}✅ PostgreSQL client found: $PSQL_VERSION${NC}"
        PSQL_AVAILABLE=true
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL client not found.${NC}"
fi

if [ "$PSQL_AVAILABLE" = false ]; then
    echo ""
    echo -e "${RED}PostgreSQL is not installed or not in PATH.${NC}"
    echo -e "${YELLOW}Please install PostgreSQL 16+:${NC}"
    echo "  macOS: brew install postgresql@16"
    echo "  Linux (Ubuntu/Debian): sudo apt-get install postgresql-16"
    echo "  Linux (CentOS/RHEL): sudo yum install postgresql16-server"
    echo ""
    if ! prompt_yesno "Continue anyway? (You'll need to install PostgreSQL later)" "n"; then
        exit 1
    fi
fi

# Check if PostgreSQL is running
if [ "$PSQL_AVAILABLE" = true ]; then
    if pg_isready >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL service is running${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL service may not be running. Please start it.${NC}"
        echo "  macOS: brew services start postgresql@16"
        echo "  Linux: sudo systemctl start postgresql"
    fi
fi

echo ""

# Check Redis (local installation required)
echo "Checking Redis (local installation)..."
REDIS_AVAILABLE=false
if command -v redis-cli &> /dev/null; then
    if redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is running${NC}"
        REDIS_AVAILABLE=true
    else
        echo -e "${YELLOW}⚠️  Redis client found but Redis may not be running${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Redis client not found or Redis is not running.${NC}"
fi

if [ "$REDIS_AVAILABLE" = false ]; then
    echo ""
    echo -e "${RED}Redis is not installed or not running.${NC}"
    echo -e "${YELLOW}Please install and start Redis:${NC}"
    echo "  macOS: brew install redis && brew services start redis"
    echo "  Linux (Ubuntu/Debian): sudo apt-get install redis-server && sudo systemctl start redis"
    echo "  Linux (CentOS/RHEL): sudo yum install redis && sudo systemctl start redis"
    echo ""
    if ! prompt_yesno "Continue anyway? (You'll need to install and start Redis later)" "n"; then
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}=== Installation ===${NC}"
echo ""

if prompt_yesno "Install backend dependencies?" "y"; then
    echo "Installing backend dependencies..."
    npm install
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
fi

if prompt_yesno "Install app dependencies?" "y"; then
    echo "Installing app dependencies..."
    cd app
    npm install
    cd ..
    echo -e "${GREEN}✅ App dependencies installed${NC}"
fi

if prompt_yesno "Install system-admin backend dependencies?" "y"; then
    echo "Installing system-admin backend dependencies..."
    if [ -d "apps/system-admin/backend" ]; then
        cd apps/system-admin/backend
        npm install
        cd ../../..
        echo -e "${GREEN}✅ System-admin backend dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠️  System-admin backend directory not found${NC}"
    fi
fi

if prompt_yesno "Install system-admin frontend dependencies?" "y"; then
    echo "Installing system-admin frontend dependencies..."
    if [ -d "apps/system-admin/frontend" ]; then
        cd apps/system-admin/frontend
        npm install
        cd ../../..
        echo -e "${GREEN}✅ System-admin frontend dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠️  System-admin frontend directory not found${NC}"
    fi
fi

echo ""
echo -e "${BLUE}=== Environment Configuration ===${NC}"
echo ""

# Create .env file using the create-env script
if [ -f .env ]; then
    if ! prompt_yesno ".env file exists. Overwrite?" "n"; then
        echo "Keeping existing .env file"
    else
        echo "Creating .env file with all defaults..."
        bash scripts/create-env.sh
    fi
else
    echo "Creating .env file with all defaults..."
    bash scripts/create-env.sh
fi
        SKIP_ENV=true
    fi
fi

if [ "$SKIP_ENV" != "true" ]; then
    echo "Configuring environment variables..."
    echo ""
    
    # Application settings
    NODE_ENV=$(prompt_input "Node environment (development/production)" "development")
    PORT=$(prompt_input "Backend port" "3000")
    FRONTEND_URL=$(prompt_input "Frontend URL" "http://localhost:3001")
    APP_URL=$(prompt_input "Application URL" "http://localhost:3000")
    
    # Database settings (local PostgreSQL)
    echo ""
    echo "Database Configuration (Local PostgreSQL):"
    echo "Note: You need to create the database manually if it doesn't exist."
    DB_HOST=$(prompt_input "Database host" "localhost")
    DB_PORT=$(prompt_input "Database port" "5432")
    DB_USER=$(prompt_input "Database user" "postgres")
    DB_PASSWORD=$(prompt_input "Database password" "")
    DB_NAME=$(prompt_input "Database name" "mero_jugx")
    
    echo ""
    echo "Do you need to create the database? Run this command manually:"
    echo "  createdb -U $DB_USER $DB_NAME"
    echo "  OR"
    echo "  psql -U $DB_USER -c \"CREATE DATABASE $DB_NAME;\""
    
    # Redis settings (local Redis)
    echo ""
    echo "Redis Configuration (Local Redis):"
    REDIS_HOST=$(prompt_input "Redis host" "localhost")
    REDIS_PORT=$(prompt_input "Redis port" "6379")
    
    # JWT settings
    echo ""
    echo "JWT Configuration:"
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
    fi
    if [ -z "$JWT_REFRESH_SECRET" ]; then
        JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    fi
    
    # Email settings
    echo ""
    if prompt_yesno "Configure email settings now?" "n"; then
        SMTP_HOST=$(prompt_input "SMTP host" "")
        SMTP_PORT=$(prompt_input "SMTP port" "587")
        SMTP_USER=$(prompt_input "SMTP user" "")
        SMTP_PASS=$(prompt_input "SMTP password" "")
        SMTP_FROM=$(prompt_input "From email" "")
    fi
    
    # Payment settings
    echo ""
    if prompt_yesno "Configure payment gateways now?" "n"; then
        STRIPE_SECRET=$(prompt_input "Stripe secret key (leave empty to skip)" "")
        ESEWA_MERCHANT_ID=$(prompt_input "eSewa merchant ID (leave empty to skip)" "")
    fi
    
    # Generate .env file
    cat > .env << EOF
# Application
NODE_ENV=$NODE_ENV
PORT=$PORT
API_PREFIX=api
FRONTEND_URL=$FRONTEND_URL
APP_URL=$APP_URL

# Database (Local PostgreSQL - NOT Docker)
DB_TYPE=postgres
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# Redis (Local Redis - NOT Docker)
REDIS_HOST=$REDIS_HOST
REDIS_PORT=$REDIS_PORT

# JWT
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
EOF

    if [ -n "$SMTP_HOST" ]; then
        cat >> .env << EOF

# Email
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_FROM=$SMTP_FROM
EOF
    fi

    if [ -n "$STRIPE_SECRET" ]; then
        cat >> .env << EOF

# Stripe
STRIPE_SECRET_KEY=$STRIPE_SECRET
EOF
    fi

    if [ -n "$ESEWA_MERCHANT_ID" ]; then
        cat >> .env << EOF

# eSewa
ESEWA_MERCHANT_ID=$ESEWA_MERCHANT_ID
ESEWA_SECRET_KEY=
ESEWA_MODE=sandbox
EOF
    fi
    
    echo -e "${GREEN}✅ .env file created${NC}"
fi

# Create app/.env
if [ ! -f app/.env ]; then
    API_URL=$(grep APP_URL .env | cut -d'=' -f2 || echo "http://localhost:3000")
    cat > app/.env << EOF
VITE_API_URL=${API_URL}/api/v1
VITE_APP_NAME=Mero Jugx
EOF
    echo -e "${GREEN}✅ App .env file created${NC}"
fi

echo ""
echo -e "${BLUE}=== Build ===${NC}"
echo ""

if prompt_yesno "Build backend?" "y"; then
    echo "Building backend..."
    npm run build || echo -e "${YELLOW}⚠️  Build failed${NC}"
fi

if prompt_yesno "Build app?" "y"; then
    echo "Building app..."
    cd app
    npm run build || echo -e "${YELLOW}⚠️  Build failed${NC}"
    cd ..
fi

echo ""
echo -e "${BLUE}=== Database Setup ===${NC}"
echo ""

if [ "$PSQL_AVAILABLE" = true ]; then
    if prompt_yesno "Initialize database (run migrations and seeds)?" "n"; then
        echo "Initializing database..."
        npm run db:init || echo -e "${YELLOW}⚠️  Database initialization failed${NC}"
        echo -e "${YELLOW}Make sure PostgreSQL is running and the database exists.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL is not available. Skipping database initialization.${NC}"
    echo "After installing PostgreSQL, create the database and run 'npm run db:init'"
fi

echo ""
echo -e "${GREEN}✨ Manual setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review your .env file"
echo "2. Make sure PostgreSQL and Redis are running"
echo "3. Initialize database: npm run db:init"
echo "   This will run migrations and seed base data (packages, permissions, roles, etc.)"
echo "4. Start development servers: npm run dev"
echo "5. Visit http://localhost:3001 to access the application"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"

