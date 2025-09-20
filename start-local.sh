#!/bin/bash

# FrikInvoice Local Development Startup Script
# This script starts the entire FrikInvoice application locally using Docker Compose

echo "🚀 Starting FrikInvoice Local Development Environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

# Navigate to the backend directory where docker-compose is located
cd "$(dirname "$0")"

echo "📦 Building and starting services..."
echo "   - MongoDB (port 27016)"
echo "   - Backend API (port 8080)"
echo "   - Frontend (port 3000)"
echo ""

# Start the services
docker-compose -f docker-compose.local.yml up --build

echo ""
echo "🎉 FrikInvoice is now running locally!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8080"
echo "🗄️  MongoDB: localhost:27016"
echo ""
echo "👤 Default admin login:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🛑 To stop the services, press Ctrl+C or run: ./stop-local.sh"
