@echo off
REM Quick Test Runner for Medical Records API (Windows)
REM Usage: run-medical-tests.bat [basic|advanced|all]

setlocal enabledelayedexpansion

REM Configuration
set SERVER_URL=http://localhost:3000
set TIMEOUT=30
set TEST_TYPE=%1

if "%TEST_TYPE%"=="" set TEST_TYPE=basic

REM Check for command
if "%TEST_TYPE%"=="help" goto show_help
if "%TEST_TYPE%"=="-h" goto show_help
if "%TEST_TYPE%"=="--help" goto show_help

echo.
echo ================================================================
echo   Medical Records API - Test Suite
echo ================================================================
echo.

REM Check if server is running
echo Checking if server is running on %SERVER_URL%...
setlocal enabledelayedexpansion

for /L %%i in (1,1,%TIMEOUT%) do (
  powershell -Command "try { $response = Invoke-WebRequest -Uri '%SERVER_URL%/api/health' -ErrorAction Stop -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>&1
  if !ERRORLEVEL! equ 0 (
    echo ^✓ Server is ready!
    goto server_ready
  )
  if %%i equ 5 echo Waiting for server...
  timeout /t 1 /nobreak >nul 2>&1
)

echo ^✗ Server not responding after %TIMEOUT% seconds
echo.
echo Make sure to start the server:
echo   npm run dev
exit /b 1

:server_ready

if "%TEST_TYPE%"=="basic" goto run_basic
if "%TEST_TYPE%"=="advanced" goto run_advanced
if "%TEST_TYPE%"=="all" goto run_all

echo Unknown command: %TEST_TYPE%
goto show_help

:run_basic
echo.
echo ================================================================
echo   Running Basic Medical Records Tests
echo ================================================================
echo.
if exist test-medical-records.js (
  node test-medical-records.js
) else (
  echo ^✗ test-medical-records.js not found
  exit /b 1
)
goto test_complete

:run_advanced
echo.
echo ================================================================
echo   Running Advanced Medical Records Tests
echo ================================================================
echo.
if exist test-medical-records-advanced.ts (
  npx tsx test-medical-records-advanced.ts
) else (
  echo ^✗ test-medical-records-advanced.ts not found
  exit /b 1
)
goto test_complete

:run_all
echo.
echo ================================================================
echo   Running All Medical Records Tests
echo ================================================================
echo.
if exist test-medical-records.js (
  echo Running basic tests...
  node test-medical-records.js
  if !ERRORLEVEL! neq 0 (
    echo Basic tests failed
    exit /b 1
  )
) else (
  echo ^✗ test-medical-records.js not found
  exit /b 1
)

if exist test-medical-records-advanced.ts (
  echo.
  echo Running advanced tests...
  npx tsx test-medical-records-advanced.ts
  if !ERRORLEVEL! neq 0 (
    echo Advanced tests failed
    exit /b 1
  )
) else (
  echo ^✗ test-medical-records-advanced.ts not found
  exit /b 1
)
goto test_complete

:test_complete
echo.
echo ================================================================
echo   Test Execution Complete
echo ================================================================
echo.
echo ^✓ All tests completed successfully!
exit /b 0

:show_help
echo Medical Records API Test Runner
echo.
echo Usage: run-medical-tests.bat [command]
echo.
echo Commands:
echo   basic       - Run basic integration tests (default)
echo   advanced    - Run advanced validation tests
echo   all         - Run all tests
echo   help        - Show this help message
echo.
echo Examples:
echo   run-medical-tests.bat basic
echo   run-medical-tests.bat advanced
echo   run-medical-tests.bat all
echo.
exit /b 0
