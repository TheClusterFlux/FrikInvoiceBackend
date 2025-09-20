@echo off
REM FrikInvoice Local Development Startup Script (Windows)
REM This script starts the entire FrikInvoice application locally using Docker Compose

echo 🚀 Starting FrikInvoice Local Development Environment...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ docker-compose is not installed. Please install docker-compose and try again.
    pause
    exit /b 1
)

echo 📦 Building and starting services...
echo    - MongoDB (port 27016)
echo    - Backend API (port 8080)
echo    - Frontend (port 3000)
echo.

REM Start the services
docker-compose -f docker-compose.local.yml up --build

echo.
echo 🎉 FrikInvoice is now running locally!
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8080
echo 🗄️  MongoDB: localhost:27016
echo.
echo 👤 Default admin login:
echo    Username: admin
echo    Password: admin123
echo.
echo 🛑 To stop the services, press Ctrl+C or run: stop-local.bat
pause
