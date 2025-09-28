@echo off

REM Enable Docker BuildKit for better caching
set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

echo 🚀 Starting optimized Docker build with BuildKit...
echo 📦 BuildKit enabled: %DOCKER_BUILDKIT%

REM Build with cache
echo ⏱️ Building with parallel processing and caching...
docker-compose -f docker-compose.local.yml build --parallel

echo ✅ Build complete! Starting containers...
docker-compose -f docker-compose.local.yml up -d

echo 🎉 All services started!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8080
