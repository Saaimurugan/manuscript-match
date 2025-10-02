@echo off
echo ========================================
echo   ScholarFinder Email Setup
echo ========================================
echo.

echo Checking current email configuration...
echo.

cd backend

echo Testing email configuration...
node test-email.js

echo.
echo ========================================
echo   Setup Instructions
echo ========================================
echo.
echo 1. Copy backend/.env.example to backend/.env if not exists
echo 2. Edit backend/.env and add your email settings:
echo.
echo    EMAIL_SERVICE=smtp
echo    SMTP_HOST=smtp.gmail.com
echo    SMTP_PORT=587
echo    SMTP_SECURE=false
echo    SMTP_USER=your-email@gmail.com
echo    SMTP_PASS=your-app-password
echo    EMAIL_FROM=your-email@gmail.com
echo    EMAIL_FROM_NAME=ScholarFinder
echo.
echo 3. For Gmail: Create an App Password at:
echo    https://myaccount.google.com/apppasswords
echo.
echo 4. Run this script again to test
echo.
echo 5. Restart the backend server: npm run dev
echo.
echo See backend/EMAIL_SETUP.md for detailed instructions
echo.
pause