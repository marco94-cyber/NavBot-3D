@echo off
cd /d "%~dp0frontend"
echo [NavBot 3D] Installing/checking frontend dependencies...
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed. Check Node.js and internet access.
  pause
  exit /b 1
)
echo [NavBot 3D] Starting Three.js at http://127.0.0.1:5173
call npm run dev
pause
