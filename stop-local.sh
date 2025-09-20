#!/bin/bash

# FrikInvoice Local Development Stop Script
# This script stops the local development environment

echo "🛑 Stopping FrikInvoice Local Development Environment..."

# Navigate to the backend directory where docker-compose is located
cd "$(dirname "$0")"

# Stop and remove containers
docker-compose -f docker-compose.local.yml down

echo "✅ FrikInvoice local development environment stopped."
echo ""
echo "💡 To start again, run: ./start-local.sh"
echo "🗑️  To remove all data (including database), run: ./clean-local.sh"
