@echo off
cd /d "%~dp0backend"
echo [NavBot 3D] Installing/checking Python dependencies...
py -m pip install -r requirements.txt
if errorlevel 1 (
  echo ERROR: Python dependencies did not install. Check Python and internet access.
  pause
  exit /b 1
)
echo [NavBot 3D] Starting Python AI API at http://127.0.0.1:8000
py -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
