#!/bin/bash

# Mero Jugx - Complete Reset Script (Bash)
# This script removes EVERYTHING and prepares for fresh setup
# WARNING: This will DELETE ALL DATA, node_modules, builds, database tables, and .env files

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Mero Jugx - Complete Reset Script                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  WARNING: This will DELETE EVERYTHING!"
echo ""
echo "This script will:"
echo "  ✗ Remove all node_modules (backend and frontend)"
echo "  ✗ Remove all dist/build folders"
echo "  ✗ Drop ALL database tables and data (including all chats, tickets, users, organizations)"
echo "  ✗ Remove .env files"
echo "  ✗ Clear npm cache"
echo "  ✗ Clear logs"
echo "  ✗ Clear uploads"
echo "  ✗ Stop Docker containers (if running)"
echo ""
echo "After reset, you need to:"
echo "  1. Run 'npm run setup' to set up everything fresh"
echo "  2. Run 'npm run db:init' to initialize database (create tables and seed data)"
echo ""

read -p "Are you absolutely sure? Type 'RESET' to continue: " response
if [ "$response" != "RESET" ]; then
    echo "Reset cancelled."
    exit 0
fi

echo ""
echo "Starting complete reset..."
echo ""

# Step 1: Stop and remove Docker containers
echo "[1/9] Stopping and removing Docker containers..."
if command -v docker &> /dev/null; then
    # Force remove all containers matching "mero"
    CONTAINERS=$(docker ps -a --format "{{.Names}}" | grep "mero" || true)
    if [ ! -z "$CONTAINERS" ]; then
        echo "  Forcing removal of mero-related containers..."
        for container in $CONTAINERS; do
            docker rm -f "$container" 2>/dev/null || true
        done
    fi
    docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
    echo "  ✓ Docker containers stopped and removed"
else
    echo "  ⚠ Docker not found, skipping"
fi
echo ""

# Step 2: Remove node_modules (with retry for locked files)
echo "[2/9] Removing node_modules..."
if [ -d "node_modules" ]; then
    # Try multiple times with delay for locked files
    for i in 1 2 3; do
        rm -rf node_modules 2>/dev/null && break || sleep 1
    done
    if [ -d "node_modules" ]; then
        # Force remove with chmod if still exists
        chmod -R u+w node_modules 2>/dev/null
        rm -rf node_modules
    fi
    echo "  ✓ Backend node_modules removed"
fi
if [ -d "frontend/node_modules" ]; then
    for i in 1 2 3; do
        rm -rf frontend/node_modules 2>/dev/null && break || sleep 1
    done
    if [ -d "frontend/node_modules" ]; then
        chmod -R u+w frontend/node_modules 2>/dev/null
        rm -rf frontend/node_modules
    fi
    echo "  ✓ Frontend node_modules removed"
fi
if [ -d "apps/system-admin/backend/node_modules" ]; then
    for i in 1 2 3; do
        rm -rf apps/system-admin/backend/node_modules 2>/dev/null && break || sleep 1
    done
    if [ -d "apps/system-admin/backend/node_modules" ]; then
        chmod -R u+w apps/system-admin/backend/node_modules 2>/dev/null
        rm -rf apps/system-admin/backend/node_modules
    fi
    echo "  ✓ System-admin backend node_modules removed"
fi
if [ -d "apps/system-admin/frontend/node_modules" ]; then
    for i in 1 2 3; do
        rm -rf apps/system-admin/frontend/node_modules 2>/dev/null && break || sleep 1
    done
    if [ -d "apps/system-admin/frontend/node_modules" ]; then
        chmod -R u+w apps/system-admin/frontend/node_modules 2>/dev/null
        rm -rf apps/system-admin/frontend/node_modules
    fi
    echo "  ✓ System-admin frontend node_modules removed"
fi
echo ""

# Step 3: Remove build artifacts
echo "[3/9] Removing build artifacts..."
[ -d "api/dist" ] && rm -rf api/dist && echo "  ✓ api/dist removed"
[ -d "app/dist" ] && rm -rf app/dist && echo "  ✓ app/dist removed"
[ -d "app/build" ] && rm -rf app/build && echo "  ✓ app/build removed"
[ -d "apps/system-admin/backend/dist" ] && rm -rf apps/system-admin/backend/dist && echo "  ✓ System-admin backend dist removed"
[ -d "apps/system-admin/frontend/dist" ] && rm -rf apps/system-admin/frontend/dist && echo "  ✓ System-admin frontend dist removed"
[ -d "coverage" ] && rm -rf coverage && echo "  ✓ Coverage reports removed"
[ -d "app/coverage" ] && rm -rf app/coverage && echo "  ✓ app coverage removed"
[ -d ".next" ] && rm -rf .next && echo "  ✓ Next.js build removed"
[ -d "app/.next" ] && rm -rf app/.next && echo "  ✓ app Next.js build removed"
echo ""

# Step 4: Clear logs
echo "[4/9] Clearing logs and temporary files..."
[ -d "logs" ] && rm -rf logs/* && echo "  ✓ logs/ cleared"
LOG_FILES=("error-log.txt" "startup-log.txt" "frontend-errors.log" "db_error.txt" "db_init_debug.log" "db_init_final.log" "db_init_output.txt" "docker_ps.txt" "docker_vols.txt" "final_error.log" "error_extract.txt")
for file in "${LOG_FILES[@]}"; do
    [ -f "$file" ] && rm -f "$file" && echo "  ✓ $file removed"
done
echo ""

# Step 5: Clear cache
echo "[5/9] Clearing npm cache..."
npm cache clean --force 2>/dev/null || true
cd frontend
npm cache clean --force 2>/dev/null || true
cd ..
if [ -d "apps/system-admin/backend" ]; then
    cd apps/system-admin/backend
    npm cache clean --force 2>/dev/null || true
    cd ../../..
fi
if [ -d "apps/system-admin/frontend" ]; then
    cd apps/system-admin/frontend
    npm cache clean --force 2>/dev/null || true
    cd ../../..
fi
echo "  ✓ Cache cleared"
echo ""

# Step 6: Reset database (drop all tables and data, make database completely empty)
echo "[6/9] Resetting database..."
echo "  This will:"
echo "    - Drop ALL tables and data (including all chats, tickets, users, organizations, etc.)"
echo "    - Make the database completely empty"
echo "    - Recreate tables and seed base data"
if [ -f ".env" ]; then
    echo "  Running database reset..."
    npm run db:reset > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "  ✓ Database reset completed (all tables dropped and recreated with base data)"
    else
        echo "  ⚠ Database reset failed. You may need to run it manually after setup."
        echo "  ⚠ Run 'npm run db:reset' after setup to reset database."
    fi
else
    echo "  ⚠ .env file not found. Database will be reset after setup."
    echo "  ⚠ After setup, run 'npm run db:reset' to reset database."
fi
echo ""

# Step 7: Remove environment files
echo "[7/9] Removing environment files..."
ENV_FILES=(".env" ".env.local" ".env.production" "frontend/.env" "frontend/.env.local" "frontend/.env.production")
for file in "${ENV_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file" && echo "  ✓ $file removed" || echo "  ⚠ Failed to remove $file"
    fi
done
echo ""

# Step 8: Clear uploads (keep .gitkeep if exists)
echo "[8/9] Clearing uploaded files..."
if [ -d "uploads" ]; then
    find uploads -type f ! -name '.gitkeep' -delete 2>/dev/null || true
    echo "  ✓ Uploaded files cleared"
fi
echo ""

# Step 9: Remove Docker volumes (ALWAYS remove to ensure complete reset)
echo "[9/9] Removing Docker volumes..."
echo "  This ensures all database data is completely removed from Docker volumes"
if command -v docker &> /dev/null; then
    docker-compose down -v 2>/dev/null || docker compose down -v 2>/dev/null || true
    
    # Targeted volume removal
    TARGET_VOLUMES=(
        "mero_jugx_postgres_data" "mero_jugx_redis_data"
        "merojugx_postgres_data" "merojugx_redis_data" 
        "mero-jugx_postgres_data" "mero-jugx_redis_data"
        "merojugx_pgdata" "merojugx_db_data"
        "mero-jugx-mongo-data" "mero-jugx-postgres-data"
    )
    
    for vol in "${TARGET_VOLUMES[@]}"; do
        docker volume rm "$vol" 2>/dev/null || true
    done

    # Catch-all for residual volumes containing "mero"
    RESIDUAL_VOLUMES=$(docker volume ls --format "{{.Name}}" | grep "mero" || true)
    if [ ! -z "$RESIDUAL_VOLUMES" ]; then
        echo "  Removing residual mero-related volumes..."
        for vol in $RESIDUAL_VOLUMES; do
            docker volume rm -f "$vol" 2>/dev/null || true
        done
    fi
    echo "  ✓ Docker volumes removed (database data completely cleared)"
else
    echo "  ⚠ Docker not found, skipping volume removal"
fi
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Reset Complete!                                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Everything has been reset."
echo ""
echo "Next steps:"
echo "  1. Run 'npm run setup' to set up the project fresh"
echo "     - Install all dependencies"
echo "     - Create .env files with all defaults"
echo "     - Set up database (Docker or local)"
echo "  2. Run 'npm run start:dev' to start development servers"
echo ""
echo "Note: Database has been reset with fresh tables and base data."
echo "      If database reset failed, run 'npm run db:reset' after setup."
echo ""
echo "Ready to start fresh! 🚀"
echo ""
