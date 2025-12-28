#!/bin/bash

# Port forward script for email-api-service
# This allows local development to connect to the production email API

echo "Starting port-forward to email-api-service..."
echo "Forwarding localhost:8081 -> email-api-service:8080"
echo ""
echo "Press Ctrl+C to stop the port-forward"
echo ""

kubectl port-forward svc/email-api-service 8081:8080 -n default


