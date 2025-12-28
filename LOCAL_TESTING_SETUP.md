# Local Testing Setup for Invoice Signing Feature

## Overview

This guide explains how to test the invoice signing feature locally by port-forwarding to the production email API service.

## Prerequisites

- kubectl configured and connected to your Kubernetes cluster
- Access to the `default` namespace
- Docker Desktop running (for local development)

## Setup Steps

### 1. Start Port-Forward to Email API

Open a terminal and run one of these commands:

**Windows:**
```bash
.\port-forward-email.bat
```

**Linux/Mac:**
```bash
chmod +x port-forward-email.sh
./port-forward-email.sh
```

**Or manually:**
```bash
kubectl port-forward svc/email-api-service 8081:8080 -n default
```

This will forward `localhost:8081` on your machine to the `email-api-service:8080` in your cluster.

**Keep this terminal open** - the port-forward needs to stay active while testing.

### 2. Start Local Development Environment

In a separate terminal, start your local development:

```bash
# If using docker-compose
docker-compose -f docker-compose.local.yml up

# Or if running backend directly
npm run dev
```

### 3. Verify Configuration

The configuration is already set up:

- **Backend** (`local.env`): `EMAIL_API_URL=http://localhost:8081`
- **Docker Compose**: Uses `host.docker.internal:8081` to access host's port-forward

### 4. Test the Feature

1. **Start your frontend** (if not already running):
   ```bash
   cd ../FrikInvoice
   npm start
   ```

2. **Create or find an order** with a customer email address

3. **Click "Send Signing Email"** button on the Orders page

4. **Check your email** (the email address you used for the customer)

5. **Click the signing link** in the email

6. **Review the invoice** and sign it

7. **Verify** the order status changes to "signed"

## Troubleshooting

### Port-Forward Not Working

**Error: "Unable to connect to the server"**
- Verify kubectl is connected: `kubectl cluster-info`
- Check service exists: `kubectl get svc email-api-service -n default`

**Error: "address already in use"**
- Port 8081 might be in use
- Change the port in `port-forward-email.bat/sh` and `local.env`:
  ```bash
  kubectl port-forward svc/email-api-service 8082:8080 -n default
  ```
  Then update `EMAIL_API_URL` to use port 8082

### Email Not Sending

**Check port-forward is active:**
```bash
# In another terminal, test the connection
curl http://localhost:8081/health
```

**Check backend logs:**
- Look for email service errors
- Verify `EMAIL_API_URL` is set correctly

**Verify email API is accessible:**
```bash
# Test the email API directly
curl -X POST http://localhost:8081/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "body": "Test email"
  }'
```

### Docker Container Can't Reach Email API

If running in Docker and getting connection errors:

1. **Verify port-forward is running on host** (not inside container)
2. **Use `host.docker.internal`** (already configured in docker-compose)
3. **On Linux**, you might need to use your host IP instead:
   ```bash
   # Find your host IP
   ip addr show docker0
   # Then use that IP in EMAIL_API_URL
   ```

### Frontend Can't Reach Backend

- Verify `REACT_APP_API_URL` is set to `http://localhost:8080/api/v1`
- Check backend is running on port 8080
- Check browser console for CORS errors

## Testing Checklist

- [ ] Port-forward is active and connected
- [ ] Backend is running and can reach email API
- [ ] Frontend is running and can reach backend
- [ ] Created order with customer email
- [ ] Sent signing email successfully
- [ ] Received email with signing link
- [ ] Clicked link and invoice displays
- [ ] Signed invoice successfully
- [ ] Order status updated to "signed"
- [ ] Signature metadata saved correctly

## Alternative: Test Without Port-Forward

If you prefer not to use port-forward, you can:

1. **Deploy email-api locally** (if you have the source code)
2. **Use a mock email service** for testing
3. **Deploy to a dev environment** instead

## Notes

- The port-forward must stay active while testing
- Emails will be sent to the actual email addresses you use
- Signature data is stored in your local MongoDB
- The signing links use `http://localhost:3000` - make sure your frontend is accessible at that URL


