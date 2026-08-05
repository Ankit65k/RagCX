# verify-dependencies.ps1
# Verifies system requirements, binaries on PATH, and basic server ports.

$ErrorActionPreference = "Continue"
$hasErrors = $false

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "RagCX: Starting Dependency & Environment Check" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Verify Node.js
Write-Host -NoNewline "Checking Node.js... "
$nodeVer = node --version 2>$null
if ($nodeVer) {
    Write-Host "FOUND ($nodeVer)" -ForegroundColor Green
} else {
    Write-Host "MISSING" -ForegroundColor Red
    $hasErrors = $true
}

# 2. Verify Python
Write-Host -NoNewline "Checking Python... "
$pythonVer = python --version 2>$null
if ($pythonVer) {
    Write-Host "FOUND ($pythonVer)" -ForegroundColor Green
} else {
    Write-Host "MISSING" -ForegroundColor Red
    $hasErrors = $true
}

# 3. Check Redis Port
Write-Host -NoNewline "Checking Redis Port (6379)... "
$redisConn = New-Object System.Net.Sockets.TcpClient
$redisPromise = $redisConn.BeginConnect("127.0.0.1", 6379, $null, $null)
$redisSuccess = $redisPromise.AsyncWaitHandle.WaitOne(1000)
if ($redisSuccess -and $redisConn.Connected) {
    Write-Host "REACHABLE" -ForegroundColor Green
    $redisConn.Close()
} else {
    Write-Host "UNREACHABLE (Ensure Redis is running on port 6379)" -ForegroundColor Red
    $hasErrors = $true
}

# 4. Check PostgreSQL Port
Write-Host -NoNewline "Checking PostgreSQL Port (5432)... "
$pgConn = New-Object System.Net.Sockets.TcpClient
$pgPromise = $pgConn.BeginConnect("127.0.0.1", 5432, $null, $null)
$pgSuccess = $pgPromise.AsyncWaitHandle.WaitOne(1000)
if ($pgSuccess -and $pgConn.Connected) {
    Write-Host "REACHABLE" -ForegroundColor Green
    $pgConn.Close()
} else {
    Write-Host "UNREACHABLE (Ensure PostgreSQL is running on port 5432)" -ForegroundColor Red
    $hasErrors = $true
}

# 5. Verify Ollama CLI
Write-Host -NoNewline "Checking Ollama CLI... "
$ollamaVer = ollama --version 2>$null
if ($ollamaVer) {
    Write-Host "FOUND ($ollamaVer)" -ForegroundColor Green
} else {
    Write-Host "MISSING (Ensure Ollama is installed and on your PATH)" -ForegroundColor Red
    $hasErrors = $true
}

Write-Host "====================================================" -ForegroundColor Cyan
if ($hasErrors) {
    Write-Host "Dependency validation failed. Please fix the missing dependencies above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All system dependencies successfully validated." -ForegroundColor Green
    exit 0
}
