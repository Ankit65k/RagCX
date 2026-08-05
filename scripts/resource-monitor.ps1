# resource-monitor.ps1
# Captures system process CPU and Working Set memory usage details.

$ErrorActionPreference = "Continue"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "RagCX: Starting System Resource Utilization Monitor" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# Processes to check
$procNames = @("node", "python", "postgres", "redis-server", "ollama")

Write-Host "| Process Name | Process ID | Working Set (MB) | CPU Time (s) |" -ForegroundColor White
Write-Host "| --- | --- | --- | --- |" -ForegroundColor White

foreach ($name in $procNames) {
    $processes = Get-Process -Name $name -ErrorAction SilentlyContinue
    if ($processes) {
        foreach ($proc in $processes) {
            $wsMb = [Math]::Round($proc.WorkingSet64 / 1MB, 2)
            $cpuTime = "N/A"
            try {
                $cpuTime = [Math]::Round($proc.TotalProcessorTime.TotalSeconds, 2)
            } catch {
                # Some processes may restrict CPU time reading depending on permission level
            }
            Write-Host "| $($proc.ProcessName) | $($proc.Id) | $wsMb MB | $cpuTime s |" -ForegroundColor Gray
        }
    } else {
        Write-Host "| $name | OFFLINE | - | - |" -ForegroundColor Yellow
    }
}

Write-Host "====================================================" -ForegroundColor Cyan
