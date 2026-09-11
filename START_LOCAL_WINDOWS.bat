@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   Multi Store Dashboard - Local Demo
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js 22 LTS, then run this file again.
  echo https://nodejs.org/
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  set "PM=npx --yes pnpm@11.19.0"
) else (
  set "PM=pnpm"
)

set "DASHBOARD_DATA_MODE=demo"
set "APP_TIMEZONE=Asia/Shanghai"

echo [1/2] Installing dependencies...
call %PM% install --frozen-lockfile
if errorlevel 1 (
  echo.
  echo [ERROR] Dependency installation failed.
  pause
  exit /b 1
)

echo.
echo [2/2] Starting local dashboard...
echo The browser will open http://localhost:3000
echo Keep this window open while using the dashboard.
echo Press Ctrl+C to stop the local server.
echo.

start "" cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:3000"
call %PM% dev

endlocal
