#!/bin/bash

# Enable Docker BuildKit for better caching
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "🚀 Starting optimized Docker build with BuildKit..."
echo "📦 BuildKit enabled: $DOCKER_BUILDKIT"

# Build with cache
time docker-compose -f docker-compose.local.yml build --parallel

echo "✅ Build complete! Starting containers..."
docker-compose -f docker-compose.local.yml up -d

echo "🎉 All services started!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8080"
