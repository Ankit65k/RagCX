# start-all.ps1
# Starts all RagCX services in separate PowerShell windows
# Run from project root: .\scripts\start-all.ps1

$ErrorActionPreference = "Continue"

# Helper: Test TCP port with timeout (500ms)
function Test-TcpPort {
    param([string]$HostName, [int]$Port, [int]$TimeoutMs = 500)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $connect = $client.BeginConnect($HostName, $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        if ($wait) {
            $client.EndConnect($connect)
            $client.Close()
            return $true
        } else {
            $client.Close()
            return $false
        }
    } catch {
        return $false
    }
}

# 1. Work out project root from $PSScriptRoot
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RagCX: Starting All Services" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot" -ForegroundColor Gray
Write-Host ""

# 2. Check required services are reachable
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

$servicesReady = $true

# Check Ollama :11434
Write-Host -NoNewline "  Ollama (port 11434)... "
if (Test-TcpPort -HostName "localhost" -Port 11434) {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "FAILED - Ollama not reachable" -ForegroundColor Red
    $servicesReady = $false
}

# Check PostgreSQL :5432
Write-Host -NoNewline "  PostgreSQL (port 5432)... "
if (Test-TcpPort -HostName "localhost" -Port 5432) {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "FAILED - PostgreSQL not reachable" -ForegroundColor Red
    $servicesReady = $false
}

# Check Redis :6379
Write-Host -NoNewline "  Redis (port 6379)... "
if (Test-TcpPort -HostName "localhost" -Port 6379) {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "FAILED - Redis not reachable" -ForegroundColor Red
    $servicesReady = $false
}

if (-not $servicesReady) {
    Write-Host ""
    Write-Host "One or more services are not reachable. Please start Ollama, PostgreSQL, and Redis." -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Check .env files exist
Write-Host "Checking .env files..." -ForegroundColor Yellow

$envFilesOK = $true

if (-not (Test-Path "backend\.env")) {
    Write-Host "  MISSING: backend\.env - Copy from backend\.env.example" -ForegroundColor Red
    $envFilesOK = $false
}

if (-not (Test-Path "frontend\.env.local")) {
    Write-Host "  MISSING: frontend\.env.local - Copy from frontend\.env.example" -ForegroundColor Red
    $envFilesOK = $false
}

if (-not (Test-Path "ai-service\.env")) {
    Write-Host "  MISSING: ai-service\.env - Copy from ai-service\.env.example" -ForegroundColor Red
    $envFilesOK = $false
}

if (-not $envFilesOK) {
    Write-Host ""
    Write-Host "Missing .env files. Please copy the .env.example files and configure them." -ForegroundColor Red
    exit 1
}

Write-Host "  All .env files found" -ForegroundColor Green
Write-Host ""

# 4. Start services in separate windows
Write-Host "Starting services..." -ForegroundColor Yellow
Write-Host ""

# Backend (port 4000)
Write-Host "  Starting Backend..." -ForegroundColor Yellow
Write-Host -NoNewline "    Checking port 4000... "
$backendPortInUse = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
if ($backendPortInUse) {
    Write-Host "IN USE - Skipping Backend" -ForegroundColor Yellow
} else {
    Write-Host "Available" -ForegroundColor Gray
    Start-Process powershell -ArgumentList "-NoExit","-Command","`$Host.UI.RawUI.WindowTitle='RagCX Backend'; npm run dev" -WorkingDirectory "$ProjectRoot\backend"
    Write-Host "    Backend window opened" -ForegroundColor Green
}

# AI Service (port 8000)
Write-Host "  Starting AI Service..." -ForegroundColor Yellow
Write-Host -NoNewline "    Checking port 8000... "
$aiPortInUse = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($aiPortInUse) {
    Write-Host "IN USE - Skipping AI Service" -ForegroundColor Yellow
} else {
    Write-Host "Available" -ForegroundColor Gray
    Start-Process powershell -ArgumentList "-NoExit","-Command","`$Host.UI.RawUI.WindowTitle='RagCX AI Service'; python -m uvicorn app.main:app --port 8000" -WorkingDirectory "$ProjectRoot\ai-service"
    Write-Host "    AI Service window opened" -ForegroundColor Green
}

# Frontend (port 3000)
Write-Host "  Starting Frontend..." -ForegroundColor Yellow
Write-Host -NoNewline "    Checking port 3000... "
$frontendPortInUse = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($frontendPortInUse) {
    Write-Host "IN USE - Skipping Frontend" -ForegroundColor Yellow
} else {
    Write-Host "Available" -ForegroundColor Gray
    Start-Process powershell -ArgumentList "-NoExit","-Command","`$Host.UI.RawUI.WindowTitle='RagCX Frontend'; npm run dev" -WorkingDirectory "$ProjectRoot\frontend"
    Write-Host "    Frontend window opened" -ForegroundColor Green
}

Write-Host ""
Write-Host "Waiting for services to start (up to 60 seconds)..." -ForegroundColor Yellow
Write-Host ""

# 5. Poll health URLs
$backendOK = $false
$aiOK = $false
$frontendOK = $false

for ($i = 0; $i -lt 60; $i++) {
    if (-not $backendOK) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $backendOK = $true
                Write-Host "  Backend: OK" -ForegroundColor Green
            }
        } catch {}
    }

    if (-not $aiOK) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $aiOK = $true
                Write-Host "  AI Service: OK" -ForegroundColor Green
            }
        } catch {}
    }

    if (-not $frontendOK) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $frontendOK = $true
                Write-Host "  Frontend: OK" -ForegroundColor Green
            }
        } catch {}
    }

    if ($backendOK -and $aiOK -and $frontendOK) {
        break
    }

    # Print "still waiting..." every 10 seconds
    if (($i -gt 0) -and ($i % 10 -eq 0)) {
        Write-Host "  Still waiting... ($i seconds elapsed)" -ForegroundColor Yellow
    }

    Start-Sleep -Seconds 1
}

Write-Host ""

# Check if all services are healthy
$allHealthy = $backendOK -and $aiOK -and $frontendOK

if (-not $allHealthy) {
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "Service Startup FAILED" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red

    if (-not $backendOK) {
        Write-Host "  Backend: FAILED - Check the 'RagCX Backend' window for errors" -ForegroundColor Red
    }
    if (-not $aiOK) {
        Write-Host "  AI Service: FAILED - Check the 'RagCX AI Service' window for errors" -ForegroundColor Red
    }
    if (-not $frontendOK) {
        Write-Host "  Frontend: FAILED - Check the 'RagCX Frontend' window for errors" -ForegroundColor Red
    }

    Write-Host ""
    exit 1
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "RagCX Services Started" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Frontend:       http://localhost:3000" -ForegroundColor Gray
Write-Host "Backend API:    http://localhost:4000/api/v1" -ForegroundColor Gray
Write-Host "AI Service:     http://localhost:8000" -ForegroundColor Gray
Write-Host ""
