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

// Security middleware
app.use(helmet());
app.use(compression());


// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : true, // Allow all origins in development
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
