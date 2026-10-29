@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  start "" "%~dp0index.html"
  exit /b
)
node "%~dp0launch.cjs"
if errorlevel 1 pause
