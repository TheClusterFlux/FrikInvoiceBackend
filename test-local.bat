@echo off
REM FrikInvoice Local Development Test Script (Windows)
REM This script tests if the local development environment is working correctly

echo 🧪 Testing FrikInvoice Local Development Environment...
echo.

REM Navigate to the backend directory
cd /d "%~dp0"

REM Check if services are running
echo 📊 Checking service status...
docker-compose -f docker-compose.local.yml ps

echo.
echo 🔍 Testing API endpoints...

REM Wait a moment for services to be ready
timeout /t 5 /nobreak >nul

REM Test backend health endpoint
echo Testing backend health endpoint...
curl -s http://localhost:8080/api/v1/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend API is responding
) else (
    echo ❌ Backend API is not responding
)

REM Test MongoDB connection
echo Testing MongoDB connection...
docker exec frikinvoice-mongodb-local mongosh --eval "db.runCommand('ping')" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MongoDB is responding
) else (
    echo ❌ MongoDB is not responding
)

REM Test frontend
echo Testing frontend...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend is responding
) else (
    echo ❌ Frontend is not responding
)

echo.
echo 🎯 Test Summary:
echo    - Backend API: http://localhost:8080
echo    - Frontend: http://localhost:3000
echo    - MongoDB: localhost:27016
echo.
echo 👤 Default login: admin / admin123
echo.
echo 💡 If any tests failed, check the logs:
echo    docker-compose -f docker-compose.local.yml logs
pause
