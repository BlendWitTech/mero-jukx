# Mero Jugx - Interactive Reset Script (PowerShell)
# This script asks what to reset

$ErrorActionPreference = "Stop"

Write-Host "Mero Jugx - Reset" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host ""

Write-Host "What would you like to reset?" -ForegroundColor Yellow
Write-Host "  1. Everything (node_modules, builds, logs, cache, database, .env, uploads)" -ForegroundColor White
Write-Host "  2. Database Only (drop all tables and data)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1 or 2)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "WARNING: This will DELETE ALL DATA and reset the entire project!" -ForegroundColor Red
        $response = Read-Host "Are you absolutely sure? Type 'yes' to continue"
        if ($response -eq "yes") {
            Write-Host ""
            Write-Host "Resetting everything..." -ForegroundColor Blue
            node scripts/run-script.js reset-all
        } else {
            Write-Host "Reset cancelled." -ForegroundColor Yellow
        }
    }
    "2" {
        Write-Host ""
        Write-Host "WARNING: This will DELETE ALL DATABASE DATA!" -ForegroundColor Red
        $response = Read-Host "Are you absolutely sure? Type 'yes' to continue"
        if ($response -eq "yes") {
            Write-Host ""
            Write-Host "Resetting database..." -ForegroundColor Blue
            Write-Host "  This will drop all tables and data." -ForegroundColor Yellow
            Write-Host "  Run 'npm run db:init' after reset to initialize database." -ForegroundColor Yellow
            node scripts/run-script.js reset-db
        } else {
            Write-Host "Database reset cancelled." -ForegroundColor Yellow
        }
    }
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

