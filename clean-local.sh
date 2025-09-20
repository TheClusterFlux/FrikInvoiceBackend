#!/bin/bash

# FrikInvoice Local Development Clean Script
# This script stops the environment and removes all data (including database)

echo "🧹 Cleaning FrikInvoice Local Development Environment..."

# Navigate to the backend directory where docker-compose is located
cd "$(dirname "$0")"

# Stop and remove containers, networks, and volumes
docker-compose -f docker-compose.local.yml down -v

# Remove any orphaned containers
docker-compose -f docker-compose.local.yml down --remove-orphans

echo "✅ FrikInvoice local development environment cleaned."
echo "🗑️  All data (including database) has been removed."
echo ""
echo "💡 To start fresh, run: ./start-local.sh"
