# start.ps1 - Launch Backend + Frontend
# Run from project root: .\start.ps1

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

Write-Host ""
Write-Host "  ORBITAL INSIGHT SSA - Starting Servers" -ForegroundColor Cyan
Write-Host ""

# Backend (Python + venv)
Write-Host "  [1/2] Starting Backend (port 8000)..." -ForegroundColor Green
$backendCmd = "Set-Location '$root\backend'; Write-Host 'BACKEND SERVER' -ForegroundColor Cyan; & '$root\.venv\Scripts\Activate.ps1'; python main.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 3

# Frontend (Vite + React)
Write-Host "  [2/2] Starting Frontend (port 5173)..." -ForegroundColor Yellow
$frontendCmd = "Set-Location '$root\frontend'; Write-Host 'FRONTEND DEV SERVER' -ForegroundColor Yellow; fnm env --use-on-cd | Out-String | Invoke-Expression; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
