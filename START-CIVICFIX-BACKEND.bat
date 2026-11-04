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
  if not exist ".env.example" (
    echo ERROR: Neither .env nor .env.example was found.
    echo Check that this file is in the CivicFix repository root.
    pause
    exit /b 1
  )
  copy ".env.example" ".env" >nul
  if errorlevel 1 (
    echo ERROR: Could not create .env from .env.example.
    pause
    exit /b 1
  )
  echo Created .env from the example configuration.
  echo Add your PostgreSQL connection details before starting the API.
  echo Opening .env in Notepad now...
  start /wait notepad ".env"
  echo.
  echo After saving .env, run this starter file again.
  pause
  exit /b 0
)

echo Checking and installing project dependencies...
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
