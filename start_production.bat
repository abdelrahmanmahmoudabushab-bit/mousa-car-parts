@echo off
title Mousa Car Parts POS & Inventory Server Launcher
echo =========================================================
echo 🚀 Launching Mousa Car Parts POS & Inventory System
echo =========================================================
echo.

cd /d "%~dp0"

echo [1/2] Building Vite Frontend...
"C:\Program Files\nodejs\node.exe" node_modules\vite\bin\vite.js build

echo [2/2] Starting Production Backend Server...
"C:\Program Files\nodejs\node.exe" server\index.js

pause
