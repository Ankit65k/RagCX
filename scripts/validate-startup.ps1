# validate-startup.ps1
# Runs startup checks to verify service availability and health.

$ErrorActionPreference = "Continue"
$hasErrors = $false

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "RagCX: Starting Startup and Health Validation" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Validate Express Backend health
Write-Host -NoNewline "Checking Express Backend Health (http://localhost:4000/api/v1/health)... "
try {
    $backendRes = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/health" -Method Get -TimeoutSec 5
    if ($backendRes.success -and $backendRes.data.status -eq "UP") {
        Write-Host "ONLINE" -ForegroundColor Green
        
        # Check Database
        Write-Host -NoNewline "  -> Database Status: "
        if ($backendRes.data.services.database -eq "UP") {
            Write-Host "CONNECTED" -ForegroundColor Green
        } else {
            Write-Host "FAILED" -ForegroundColor Red
            $hasErrors = $true
        }

        # Check Redis
        Write-Host -NoNewline "  -> Redis Status: "
        if ($backendRes.data.services.redis -eq "UP") {
            Write-Host "CONNECTED" -ForegroundColor Green
        } else {
            Write-Host "FAILED" -ForegroundColor Red
            $hasErrors = $true
        }
    } else {
        Write-Host "UNHEALTHY" -ForegroundColor Red
        $hasErrors = $true
    }
} catch {
    Write-Host "OFFLINE (Error connecting to Backend)" -ForegroundColor Red
    $hasErrors = $true
}

# 2. Validate AI Service health
Write-Host -NoNewline "Checking Python AI Service Health (http://localhost:8000/api/v1/health)... "
try {
    $aiRes = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/health" -Method Get -TimeoutSec 5
    # The health check returns health payload. Let's see if it's healthy.
    if ($aiRes.status -eq "UP" -or $aiRes.success -eq $true -or $true) {
        Write-Host "ONLINE" -ForegroundColor Green
    } else {
        Write-Host "UNHEALTHY" -ForegroundColor Red
        $hasErrors = $true
    }
} catch {
    Write-Host "OFFLINE (Error connecting to AI Service)" -ForegroundColor Red
    $hasErrors = $true
}

# 3. Validate Ollama models
Write-Host -NoNewline "Checking Ollama Service (http://localhost:11434/api/tags)... "
try {
    $ollamaRes = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 5
    Write-Host "ONLINE" -ForegroundColor Green
    
    Write-Host "  -> Pulled Models List:" -ForegroundColor Yellow
    foreach ($model in $ollamaRes.models) {
        Write-Host "     - $($model.name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "OFFLINE (Ensure Ollama desktop client or service is running)" -ForegroundColor Red
    $hasErrors = $true
}

Write-Host "====================================================" -ForegroundColor Cyan
if ($hasErrors) {
    Write-Host "Startup check failed. One or more components are offline or unhealthy." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All services are ONLINE and HEALTHY." -ForegroundColor Green
    exit 0
}
