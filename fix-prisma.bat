@echo off
echo ========================================
echo   Fixing Prisma Client Generation
echo ========================================
echo.

echo Stopping any running Node.js processes...
taskkill /f /im node.exe 2>nul
timeout /t 3 /nobreak > nul

echo Navigating to backend directory...
cd backend

echo Cleaning Prisma cache...
rmdir /s /q node_modules\.prisma 2>nul
rmdir /s /q node_modules\@prisma 2>nul

echo Clearing npm cache...
call npm cache clean --force

echo Reinstalling Prisma...
call npm install @prisma/client prisma --no-audit --no-fund

echo Generating Prisma client...
call npx prisma generate

if %errorlevel% equ 0 (
    echo ✅ Prisma client generated successfully!
    echo.
    echo You can now run: setup-and-start.bat
) else (
    echo ❌ Still having issues. Try these manual steps:
    echo.
    echo 1. Close all Node.js processes and terminals
    echo 2. Restart your computer
    echo 3. Run as Administrator: fix-prisma.bat
    echo 4. Or manually run:
    echo    cd backend
    echo    npx prisma generate
)

echo.
pause