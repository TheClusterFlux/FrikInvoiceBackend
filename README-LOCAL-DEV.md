# FrikInvoice Local Development Setup

This directory contains everything you need to run FrikInvoice locally for development and testing.

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Docker Compose installed
- Git (for cloning the repository)

### Starting the Application

**On Windows:**
```bash
start-local.bat
```

**On Linux/Mac:**
```bash
./start-local.sh
```

This will start:
- MongoDB on port 27016
- Backend API on port 8080  
- Frontend on port 3000

### Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **MongoDB**: localhost:27016

### Default Login Credentials

- **Username**: admin
- **Password**: admin123

## Development Workflow

### Making Changes

1. **Frontend Changes**: Edit files in `../FrikInvoice/src/` - changes will hot-reload automatically
2. **Backend Changes**: Edit files in `./src/` - changes will hot-reload automatically (using nodemon)
3. **Database Changes**: The MongoDB container persists data between restarts

### Stopping the Application

**On Windows:**
```bash
stop-local.bat
```

**On Linux/Mac:**
```bash
./stop-local.sh
```

### Cleaning Everything (Including Database)

**On Windows:**
```bash
clean-local.bat
```

**On Linux/Mac:**
```bash
./clean-local.sh
```

## Configuration

### Environment Variables

The application uses the following environment variables for local development:

**Backend (`local.env`):**
- `NODE_ENV=development`
- `PORT=8080`
- `MONGO_PASSWORD=frikinvoice123`
- `IS_LOCAL=true`
- `MONGODB_URI=mongodb://root:frikinvoice123@mongodb:27017/frikinvoice?authSource=admin`

**Frontend (`../FrikInvoice/local.env`):**
- `REACT_APP_API_URL=http://localhost:8080/api/v1`
- `REACT_APP_LOG_LEVEL=debug`
- `REACT_APP_ENVIRONMENT=development`

### Database

The MongoDB container is initialized with:
- Database: `frikinvoice`
- Default admin user (username: admin, password: admin123)
- Sample inventory items
- Sample client data
- Proper indexes for performance

## File Structure

```
FrikInvoiceBackend/
├── docker-compose.local.yml    # Docker Compose configuration
├── init-mongo.js              # MongoDB initialization script
├── local.env                  # Backend environment variables
├── start-local.sh/.bat        # Start script
├── stop-local.sh/.bat         # Stop script
├── clean-local.sh/.bat        # Clean script
└── README.md                  # This file

FrikInvoice/
├── local.env                  # Frontend environment variables
└── ...                       # Frontend source code
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Make sure ports 3000, 8080, and 27016 are not being used by other applications
   - Stop any existing FrikInvoice containers: `docker-compose -f docker-compose.local.yml down`

2. **Docker Not Running**
   - Start Docker Desktop
   - Wait for it to fully initialize before running the start script

3. **Permission Issues (Linux/Mac)**
   - Make sure the shell scripts are executable: `chmod +x *.sh`

4. **Database Connection Issues**
   - Wait a few seconds after starting for MongoDB to fully initialize
   - Check the logs: `docker-compose -f docker-compose.local.yml logs mongodb`

5. **Frontend Not Loading**
   - Check if the backend is running: `docker-compose -f docker-compose.local.yml ps`
   - Verify the API URL in the frontend environment variables

### Viewing Logs

To view logs for all services:
```bash
docker-compose -f docker-compose.local.yml logs -f
```

To view logs for a specific service:
```bash
docker-compose -f docker-compose.local.yml logs -f backend
docker-compose -f docker-compose.local.yml logs -f frontend
docker-compose -f docker-compose.local.yml logs -f mongodb
```

### Database Access

To connect to the MongoDB database directly:
```bash
docker exec -it frikinvoice-mongodb-local mongosh -u root -p frikinvoice123 --authenticationDatabase admin
```

## Development Tips

1. **Hot Reloading**: Both frontend and backend support hot reloading, so changes are reflected immediately
2. **Database Persistence**: Data persists between container restarts unless you run the clean script
3. **API Testing**: Use tools like Postman or curl to test the backend API directly
4. **Frontend Debugging**: Use browser dev tools and React DevTools for frontend debugging
5. **Backend Debugging**: Use `console.log` statements or a debugger in your IDE

## Production vs Development

This local setup is configured for development with:
- Hot reloading enabled
- Debug logging enabled
- CORS allowing all origins
- No SSL/TLS
- Default passwords (change these for production!)

When deploying to production, make sure to:
- Use strong passwords
- Enable SSL/TLS
- Configure proper CORS origins
- Use production MongoDB instance
- Set appropriate environment variables

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. View the container logs
3. Ensure all prerequisites are installed
4. Try cleaning and restarting: `clean-local.sh` then `start-local.sh`
