@echo off
echo Starting Options Trading ROI Tracker...
echo.

echo Starting backend server...
start "Backend Server" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting frontend development server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Application starting...
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001/api/health
echo.
echo Press any key to exit...
pause > nul
