#!/bin/bash

# Mero Jugx - Docker Setup Script (Bash)
# Sets up Docker containers for PostgreSQL and Redis, and installs dependencies

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

echo "Mero Jugx - Docker Setup"
echo "========================"
echo ""
echo "If you have issues with Docker containers or volumes, run:"
echo "  docker compose down -v"
echo "  docker volume prune"
echo "For a full reset, use scripts/reset-all.sh."
echo "For manual setup, use scripts/setup-manual.sh."

# Check if Docker is installed
echo "Checking Docker installation..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "✓ Docker found: $DOCKER_VERSION"
else
    echo "✗ Docker is not installed or not in PATH."
    echo "Please install Docker:"
    echo "  Linux: https://docs.docker.com/engine/install/"
    echo "  macOS: https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo ""
echo "Step 1: Installing dependencies..."
if [ -d "node_modules" ] && [ -d "app/node_modules" ]; then
    echo "  Dependencies already installed, skipping..."
else
    echo "  Installing backend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "✗ Failed to install backend dependencies."
        exit 1
    fi
    echo "✓ Backend dependencies installed"
    
    echo "  Installing app dependencies..."
    cd app
    npm install
    if [ $? -ne 0 ]; then
        echo "✗ Failed to install app dependencies."
        cd ..
        exit 1
    fi
    cd ..
    echo "✓ App dependencies installed"
    
    echo "  Installing system-admin backend dependencies..."
    if [ -d "apps/system-admin/backend" ]; then
        cd apps/system-admin/backend
        npm install
        if [ $? -ne 0 ]; then
            echo "✗ Failed to install system-admin backend dependencies."
            cd ../../..
            exit 1
        fi
        cd ../../..
        echo "✓ System-admin backend dependencies installed"
    fi
    
    echo "  Installing system-admin frontend dependencies..."
    if [ -d "apps/system-admin/frontend" ]; then
        cd apps/system-admin/frontend
        npm install
        if [ $? -ne 0 ]; then
            echo "✗ Failed to install system-admin frontend dependencies."
            cd ../../..
            exit 1
        fi
        cd ../../..
        echo "✓ System-admin frontend dependencies installed"
    fi
fi

echo ""
echo "Step 2: Setting up environment files..."
bash scripts/create-env.sh

echo ""
echo "Step 3: Starting Docker containers (PostgreSQL and Redis)..."
docker-compose up -d postgres redis
if [ $? -eq 0 ]; then
    echo "✓ Docker containers started"
    echo ""
    echo "Waiting for containers to be ready..."
    sleep 5
    echo ""
    echo "✓ Docker setup complete!"
    echo ""
    echo "Docker containers are running:"
    echo "  - PostgreSQL: localhost:5433"
    echo "  - Redis: localhost:6380"
    echo ""
    echo "Next steps:"
    echo "  1. Initialize database: npm run db:init"
    echo "     This will run migrations and seed base data"
    echo "  2. Start development servers: npm run start:dev"
else
    echo "✗ Docker setup failed. Make sure Docker is running."
    exit 1
fi

