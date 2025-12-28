// Script to create admin user in local MongoDB
// Run with: node create-admin-user.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

const mongoPassword = process.env.MONGO_PASSWORD || 'frikinvoice123';
const isLocal = process.env.IS_LOCAL === 'true';

// Determine MongoDB URI based on environment
// In Docker Compose, use service name 'mongodb'
// Locally, use localhost
let mongoUri;
if (process.env.MONGODB_URI) {
  mongoUri = process.env.MONGODB_URI;
} else if (isLocal && process.env.DOCKER_COMPOSE) {
  // Running in Docker Compose
  mongoUri = `mongodb://root:${mongoPassword}@mongodb:27017/frikinvoice?authSource=admin`;
} else if (isLocal) {
  // Running locally (not in Docker)
  mongoUri = `mongodb://root:${mongoPassword}@localhost:27016/frikinvoice?authSource=admin`;
} else {
  // Production/K8s
  mongoUri = `mongodb://root:${mongoPassword}@mongodb.default.svc.cluster.local:27017/frikinvoice?authSource=admin`;
}

async function createAdminUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const username = 'admin';
    const password = 'admin123';
    const email = 'admin@frikinvoice.local';

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log(`User '${username}' already exists.`);
      console.log('Resetting password...');
      existingUser.password = password; // Will be re-hashed by pre-save hook
      existingUser.isActive = true;
      await existingUser.save();
      console.log(`\n✅ Admin user password reset successfully!`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Email: ${existingUser.email || email}`);
      console.log(`   Role: ${existingUser.role}\n`);
      process.exit(0);
    }

    // Create new admin user
    // Note: The User model will automatically hash the password via pre-save hook
    const adminUser = new User({
      username,
      password, // Will be hashed by pre-save hook
      email,
      role: 'admin',
      isActive: true
    });

    await adminUser.save();
    console.log(`\n✅ Admin user created successfully!`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: admin\n`);

  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createAdminUser();

