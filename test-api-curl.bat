@echo off
echo ========================================
echo ScholarFinder API Test with curl
echo ========================================
echo.

echo [1/4] Testing health endpoint...
curl -s http://localhost:3002/health
if %errorlevel% neq 0 (
    echo ❌ Health check failed - backend may not be running
    pause
    exit /b 1
)
echo.
echo ✅ Health check passed
echo.

echo [2/4] Testing processes endpoint without auth (should fail)...
curl -s -w "HTTP Status: %%{http_code}\n" http://localhost:3002/api/processes
echo.

echo [3/4] Testing login...
echo Attempting to login with user@test.com...
curl -s -X POST -H "Content-Type: application/json" -d "{\"email\":\"user@test.com\",\"password\":\"testpassword123\"}" http://localhost:3002/api/auth/login > login_response.json
if %errorlevel% neq 0 (
    echo ❌ Login request failed
    pause
    exit /b 1
)

echo Login response:
type login_response.json
echo.

echo [4/4] Manual test instructions:
echo 1. Copy the token from the login response above
echo 2. Run this command with the token:
echo curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3002/api/processes
echo.

echo Cleaning up...
del login_response.json 2>nul

echo.
echo ========================================
echo Test completed!
echo ========================================
pause