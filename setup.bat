@echo off
echo Setting up Options Trading ROI Tracker...
echo.

echo Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install root dependencies
    exit /b 1
)

echo.
echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install backend dependencies
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install frontend dependencies
    exit /b 1
)

cd ..
echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Make sure PostgreSQL is running
echo 2. Create the database schema: psql -d postgres -f database\schema.sql
echo 3. Update backend\.env with your database credentials
echo 4. Run the application: npm run dev
echo.
echo The application will be available at:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:3001
echo.
pause
