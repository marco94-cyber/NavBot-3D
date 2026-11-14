@echo off
cd /d "%~dp0"
echo Starting NavBot 3D Python Edition...
start "NavBot Python API" cmd /k ""%~dp0START_BACKEND.bat""
start "NavBot 3D Frontend" cmd /k ""%~dp0START_FRONTEND.bat""
echo Once both windows say READY, open: http://127.0.0.1:5173
start "" http://127.0.0.1:5173
