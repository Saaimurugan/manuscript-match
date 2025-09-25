@echo off
echo Starting ScholarFinder Services...

echo.
echo Starting Backend on port 3002...
start "Backend" cmd /k "cd backend && npm run dev"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend on port 8080...
start "Frontend" cmd /k "npm run dev"

echo.
echo Services are starting...
echo Backend: http://localhost:3002
echo Frontend: http://localhost:8080
echo.
echo Press any key to exit...
pause > nul