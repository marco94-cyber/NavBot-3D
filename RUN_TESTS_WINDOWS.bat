@echo off
cd /d "%~dp0backend"
py -m pytest -q
pause
