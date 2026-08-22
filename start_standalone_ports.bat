@echo off
TITLE Mousa Auto Parts - Standalone Multi-Port System Launcher
color 0A
cls
echo ========================================================
echo   MOUSA AUTO PARTS - STANDALONE SYSTEM PORT LAUNCHER
echo ========================================================
echo.
echo Launching Standalone Ports...
echo  - Port 5000: Express Backend API Server (Supabase PostgreSQL Engine)
echo  - Port 3000: Standalone Customer Web Store
echo  - Port 5173: Standalone Cashier POS Counter Terminal
echo.

start "Mousa Backend API (Port 5000)" cmd /k "node server/index.js"
start "Mousa Customer Store (Port 3000)" cmd /k "npx vite --config vite.customer.config.js"
start "Mousa Cashier POS (Port 5173)" cmd /k "npx vite"

echo.
echo ✅ All 3 Standalone System Ports Launched Successfully!
echo.
echo Links:
echo  - Customer Store: http://localhost:3000/customer.html
echo  - Cashier POS:    http://localhost:5173/
echo  - Backend API:    http://localhost:5000/api/bootstrap
echo.
pause
