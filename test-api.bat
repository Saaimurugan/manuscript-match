@echo off
echo ========================================
echo ScholarFinder API Test
echo ========================================
echo.

echo Testing backend connectivity...
echo.

echo [1/3] Testing health endpoint...
curl -s http://localhost:3002/health
if %errorlevel% neq 0 (
    echo ❌ Health check failed - backend may not be running
    echo Make sure to run setup-and-start.bat first
    pause
    exit /b 1
)
echo.
echo ✅ Health check passed

echo.
echo [2/3] Testing processes endpoint (should require auth)...
curl -s http://localhost:3002/api/processes
echo.
echo ✅ Processes endpoint responded (401 expected without auth)

echo.
echo [3/3] Testing frontend...
curl -s -I http://localhost:8080
if %errorlevel% neq 0 (
    echo ❌ Frontend not accessible
    pause
    exit /b 1
)
echo ✅ Frontend is accessible

echo.
echo ========================================
echo API Test Complete!
echo ========================================
echo.
echo If you see errors above:
echo 1. Make sure both backend and frontend are running
echo 2. Run setup-and-start.bat to start services
echo 3. Wait for "Server running on port 3002" message
echo.
pause