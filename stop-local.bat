@echo off
REM FrikInvoice Local Development Stop Script (Windows)
REM This script stops the local development environment

echo 🛑 Stopping FrikInvoice Local Development Environment...

REM Stop and remove containers
docker-compose -f docker-compose.local.yml down

echo ✅ FrikInvoice local development environment stopped.
echo.
echo 💡 To start again, run: start-local.bat
echo 🗑️  To remove all data (including database), run: clean-local.bat
pause
