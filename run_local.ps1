# DocsVerse AI - Complete Local Runner (PowerShell)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "                 DocsVerse AI - Production-Ready Runner              " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

# 1. Check backend node_modules
if (-not (Test-Path "$ScriptDir\backend\node_modules")) {
    Write-Host "[+] Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location "$ScriptDir\backend"
    npm install
    Set-Location $ScriptDir
}

# 2. Launch Backend & Open Browser
Write-Host "`n[+] Launching DocsVerse AI Server (Port 5000)..." -ForegroundColor Green
Start-Process "http://localhost:5000"
Set-Location "$ScriptDir\backend"
node server.js
