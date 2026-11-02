@echo off
setlocal
cd /d "%~dp0"

echo.
echo ==========================================
echo          CIVICFIX BACKEND STARTER
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not on PATH.
  echo Install the Node.js LTS version, then reopen this file.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not available. Reinstall Node.js LTS with npm.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo ERROR: package.json was not found.
  echo This launcher must stay in the CivicFix repository root.
  pause
  exit /b 1
)

if not exist ".env" (
  echo ERROR: The backend .env file is missing.
  echo.
  echo Copy .env.example to .env and fill in your PostgreSQL connection details.
  echo The backend cannot save or retrieve complaints until the database is configured.
  pause
  exit /b 1
)

echo Checking and installing backend dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo ERROR: Dependency installation failed.
  echo Check your internet connection and package.json, then try again.
  pause
  exit /b 1
)

echo.
echo Starting CivicFix API...
echo The API port is configured by PORT in .env (default: 5000).
echo Keep this window open while using CivicFix.
echo.
call npm run dev
echo.
echo Backend stopped. Review the error above.
pause
