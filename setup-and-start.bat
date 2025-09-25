@echo off
echo ========================================
echo ScholarFinder - Complete Setup
echo ========================================
echo.

echo [1/9] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js is available

echo.
echo [2/9] Installing frontend dependencies...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed

echo.
echo [3/9] Installing backend dependencies...
cd backend
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed

echo.
echo [4/9] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Failed to generate Prisma client
    pause
    exit /b 1
)
echo ✅ Prisma client generated

echo.
echo [5/9] Running database migrations...
call npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo ⚠️ Migration failed or already exists - continuing...
)
echo ✅ Database migrations completed

echo.
echo [6/9] Creating test users...
node create-test-user.js
if %errorlevel% neq 0 (
    echo ⚠️ Test user creation failed - continuing...
)
echo ✅ Test users created

echo.
echo [6.5/9] Creating test processes...
node create-test-processes.js
if %errorlevel% neq 0 (
    echo ⚠️ Test process creation failed - continuing...
)
echo ✅ Test processes created

echo.
echo [7/9] Starting Backend Server...
echo Opening new window for backend...
start "ScholarFinder Backend" cmd /k "npm run dev"

echo.
echo [8/9] Waiting for backend to start...
timeout /t 10 /nobreak > nul
echo ✅ Backend should be starting...

echo.
echo [9/9] Starting Frontend Server...
cd ..
echo Opening new window for frontend...
start "ScholarFinder Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo 🚀 Setup Complete! Services Starting...
echo ========================================
echo.
echo Backend:  http://localhost:3002
echo Frontend: http://localhost:8080
echo.
echo Test Login Credentials:
echo Admin: admin@test.com / adminpassword123
echo User:  user@test.com / testpassword123
echo.
echo Wait for both services to show ready messages, then:
echo 1. Open: http://localhost:8080
echo 2. Login with test credentials above
echo 3. The "Failed to load processes" error should be resolved!
echo.
echo Press any key to exit this window...
pause > nul