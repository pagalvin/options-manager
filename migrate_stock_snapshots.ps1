#!/usr/bin/env pwsh
# Database Migration Script for Stock Snapshots Table
# This script applies the stock_snapshots table migration

# Load database configuration
$envFile = Join-Path $PSScriptRoot "backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "Error: .env file not found at $envFile" -ForegroundColor Red
    Write-Host "Please create a .env file in the backend folder with your database configuration" -ForegroundColor Yellow
    Write-Host "Required variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SCHEMA" -ForegroundColor Yellow
    exit 1
}

# Read .env file
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$key" -Value $value
    }
}

# Get database configuration
$dbHost = $env:DB_HOST
$dbPort = $env:DB_PORT
$dbName = $env:DB_NAME
$dbUser = $env:DB_USER
$dbPassword = $env:DB_PASSWORD
$dbSchema = if ($env:DB_SCHEMA) { $env:DB_SCHEMA } else { "overlord" }

if (-not ($dbHost -and $dbPort -and $dbName -and $dbUser)) {
    Write-Host "Error: Missing required database configuration in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Stock Snapshots Table Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database: $dbName" -ForegroundColor Yellow
Write-Host "Host: ${dbHost}:${dbPort}" -ForegroundColor Yellow
Write-Host "Schema: $dbSchema" -ForegroundColor Yellow
Write-Host ""

# Migration file path
$migrationFile = Join-Path $PSScriptRoot "database\add_stock_snapshots_table.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "Error: Migration file not found at $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Running migration: add_stock_snapshots_table.sql" -ForegroundColor Green
Write-Host ""

# Set PGPASSWORD environment variable for psql
$env:PGPASSWORD = $dbPassword

# Run the migration
Write-Host "Executing: psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f add_stock_snapshots_table.sql" -ForegroundColor Gray
Write-Host ""

try {
    & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Migration completed successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "The stock_snapshots table has been created." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host ""
    Write-Host "Error running migration: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}
