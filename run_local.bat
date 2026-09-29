@echo off
title DocsVerse AI - Server Runner
echo =====================================================================
echo                 DocsVerse AI - Production-Ready Runner
echo =====================================================================
echo.

cd /d "%~dp0"

REM 1. Check if backend dependencies are installed
if not exist "backend\node_modules" (
    echo [+] Installing Node.js backend dependencies...
    cd backend
    call npm install
    cd ..
)

echo [+] Launching DocsVerse AI Server (Port 5000)...
start "" http://localhost:5000
cd backend
node server.js

pause
