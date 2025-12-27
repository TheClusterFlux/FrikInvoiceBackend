require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const orderRoutes = require('./routes/orders');
const clientRoutes = require('./routes/clients');
const userRoutes = require('./routes/users');
const draftRoutes = require('./routes/drafts');
const systemRoutes = require('./routes/system');

const { errorHandler } = require('./middleware/errorHandler');
const { auditLogger } = require('./middleware/auditLogger');

const app = express();
const PORT = process.env.PORT || 8080;

// Validate required environment variables at startup
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is required');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.error('ERROR: FRONTEND_URL environment variable is required in production');
  process.exit(1);
}

// Security middleware
app.use(helmet());
app.use(compression());

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check if request is already secure or forwarded as secure
    const isSecure = req.secure || 
                     req.headers['x-forwarded-proto'] === 'https' ||
                     req.headers['x-forwarded-ssl'] === 'on';
    
    if (!isSecure) {
      // Redirect to HTTPS
      const httpsUrl = `https://${req.headers.host}${req.url}`;
      return res.redirect(301, httpsUrl);
    }
    next();
  });
}


// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'production') {
      // In production, validate FRONTEND_URL is set
      if (!process.env.FRONTEND_URL) {
        console.error('FRONTEND_URL environment variable is required in production');
        return callback(new Error('CORS configuration error: FRONTEND_URL not set'));
      }
      // Allow only the configured frontend URL
      if (origin === process.env.FRONTEND_URL) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In development, allow all origins
      callback(null, true);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Audit logging middleware
app.use(auditLogger);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/drafts', draftRoutes);
app.use('/api/v1', systemRoutes);

// Error handling middleware
app.use(errorHandler);

// MongoDB connection logic based on TheClusterFlux interface guide
function getMongoConnectionString() {
  const mongoPassword = process.env.MONGO_PASSWORD;
  const isLocal = process.env.IS_LOCAL === 'true';
  
  console.log('MongoDB connection debug:');
  console.log('- MONGO_PASSWORD:', mongoPassword ? '***SET***' : 'NOT SET');
  console.log('- IS_LOCAL:', isLocal);
  
  if (!mongoPassword) {
    throw new Error('MONGO_PASSWORD environment variable is required');
  }
  
  if (isLocal) {
    const uri = `mongodb://root:${mongoPassword}@localhost:27016`;
    console.log('- Using local connection (no database specified)');
    return uri;
  } else {
    const uri = `mongodb://root:${mongoPassword}@mongodb.default.svc.cluster.local:27017`;
    console.log('- Using production connection (no database specified)');
    return uri;
  }
}

// Database connection
const mongoUri = process.env.MONGODB_URI || getMongoConnectionString();

console.log('Attempting MongoDB connection...');
console.log('Connection URI:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide password in logs

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'frikinvoice'
})
.then(() => {
  console.log('Connected to MongoDB');
  console.log(`Database: frikinvoice`);
  
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

module.exports = app;
