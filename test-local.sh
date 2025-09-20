#!/bin/bash

# FrikInvoice Local Development Test Script
# This script tests if the local development environment is working correctly

echo "🧪 Testing FrikInvoice Local Development Environment..."
echo ""

# Navigate to the backend directory
cd "$(dirname "$0")"

# Check if services are running
echo "📊 Checking service status..."
docker-compose -f docker-compose.local.yml ps

echo ""
echo "🔍 Testing API endpoints..."

# Wait a moment for services to be ready
sleep 5

# Test backend health endpoint
echo "Testing backend health endpoint..."
if curl -s http://localhost:8080/api/v1/health > /dev/null; then
    echo "✅ Backend API is responding"
else
    echo "❌ Backend API is not responding"
fi

# Test MongoDB connection
echo "Testing MongoDB connection..."
if docker exec frikinvoice-mongodb-local mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB is responding"
else
    echo "❌ MongoDB is not responding"
fi

# Test frontend
echo "Testing frontend..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is responding"
else
    echo "❌ Frontend is not responding"
fi

echo ""
echo "🎯 Test Summary:"
echo "   - Backend API: http://localhost:8080"
echo "   - Frontend: http://localhost:3000"
echo "   - MongoDB: localhost:27016"
echo ""
echo "👤 Default login: admin / admin123"
echo ""
echo "💡 If any tests failed, check the logs:"
echo "   docker-compose -f docker-compose.local.yml logs"
