@echo off
echo ========================================
echo   INVERTIS BANK - Starting Services
echo ========================================
echo.

echo [1/2] Starting Flask Backend...
start "Invertis Bank - Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\python app.py"

timeout /t 3 /nobreak >nul

echo [2/2] Starting React Frontend...
start "Invertis Bank - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   Both services starting...
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Login Credentials:
echo   Admin:   admin / Admin@123
echo   Manager: manager / Manager@123
echo   Teller:  teller / Teller@123
echo.
timeout /t 5 /nobreak >nul
start http://localhost:5173
