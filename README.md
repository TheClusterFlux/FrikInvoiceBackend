# FrikInvoice Backend

This is the backend API for the FrikInvoice order management system.

## Features

- User authentication and authorization
- Inventory management
- Order/invoice management
- Client management
- PDF generation
- Audit logging
- Tax calculation (supports both tax-added and tax-inclusive methods)

## Environment Variables

The following environment variables are required:

- `MONGO_PASSWORD`: MongoDB root password (from Kubernetes secret)
- `JWT_SECRET`: Secret key for JWT token signing
- `NODE_ENV`: Environment (production/development)
- `PORT`: Server port (default: 8080)
- `FRONTEND_URL`: Frontend URL for CORS configuration
- `TAX_CALCULATION_METHOD`: Tax calculation method ('add' or 'reverse')

## MongoDB Connection

The backend connects to MongoDB using TheClusterFlux MongoDB interface:
- Production: `mongodb://root:<MONGO_PASSWORD>@mongodb.default.svc.cluster.local:27017/frikinvoice`
- Local Development: `mongodb://root:<MONGO_PASSWORD>@localhost:27016/frikinvoice`

## Deployment

1. Create the required Kubernetes secrets:
   ```bash
   kubectl create secret generic frik-invoice-secret \
     --from-literal=jwt-secret=your-jwt-secret-here
   ```

2. Deploy the application:
   ```bash
   kubectl apply -f deployment.yaml
   ```

## API Endpoints

- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/inventory` - Get inventory items
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders` - Get orders list
- And more...

## Database Models

- **User**: User accounts and authentication
- **Inventory**: Product/inventory items
- **Order**: Orders and invoices
- **Client**: Customer information
- **AuditLog**: System audit trail
- **InvoiceCounter**: Invoice number generation

## Development

To run locally:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   ```bash
   export MONGO_PASSWORD=your-mongo-password
   export JWT_SECRET=your-jwt-secret
   export IS_LOCAL=true
   ```

3. Start the server:
   ```bash
   npm run dev
   ```