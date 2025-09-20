// MongoDB initialization script for FrikInvoice local development
// This script runs when the MongoDB container starts for the first time

// Switch to the frikinvoice database
db = db.getSiblingDB('frikinvoice');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'email', 'role'],
      properties: {
        username: {
          bsonType: 'string',
          description: 'Username must be a string and is required'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
          description: 'Email must be a valid email address'
        },
        role: {
          bsonType: 'string',
          enum: ['admin', 'user'],
          description: 'Role must be either admin or user'
        }
      }
    }
  }
});

db.createCollection('clients', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Client name must be a string and is required'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
          description: 'Email must be a valid email address'
        }
      }
    }
  }
});

db.createCollection('inventory', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'price', 'unit'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Item name must be a string and is required'
        },
        price: {
          bsonType: 'number',
          minimum: 0,
          description: 'Price must be a positive number'
        },
        unit: {
          bsonType: 'string',
          description: 'Unit must be a string'
        }
      }
    }
  }
});

db.createCollection('orders', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['clientId', 'items', 'status'],
      properties: {
        clientId: {
          bsonType: 'objectId',
          description: 'Client ID must be a valid ObjectId'
        },
        items: {
          bsonType: 'array',
          description: 'Items must be an array'
        },
        status: {
          bsonType: 'string',
          enum: ['draft', 'pending', 'completed', 'cancelled'],
          description: 'Status must be one of: draft, pending, completed, cancelled'
        }
      }
    }
  }
});

db.createCollection('auditlogs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['action', 'userId', 'timestamp'],
      properties: {
        action: {
          bsonType: 'string',
          description: 'Action must be a string and is required'
        },
        userId: {
          bsonType: 'objectId',
          description: 'User ID must be a valid ObjectId'
        },
        timestamp: {
          bsonType: 'date',
          description: 'Timestamp must be a date'
        }
      }
    }
  }
});

db.createCollection('invoicecounters');

// Create indexes for better performance
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.clients.createIndex({ email: 1 }, { unique: true });
db.inventory.createIndex({ name: 1 });
db.orders.createIndex({ clientId: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: -1 });
db.auditlogs.createIndex({ userId: 1 });
db.auditlogs.createIndex({ timestamp: -1 });

// Insert a default admin user (password: admin123)
db.users.insertOne({
  username: 'admin',
  email: 'admin@frikinvoice.local',
  password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // bcrypt hash for 'admin123'
  role: 'admin',
  createdAt: new Date(),
  lastLogin: null
});

// Insert some sample inventory items
db.inventory.insertMany([
  {
    name: 'Web Development',
    description: 'Custom web application development',
    price: 75.00,
    unit: 'hour',
    category: 'services',
    createdAt: new Date()
  },
  {
    name: 'Mobile App Development',
    description: 'iOS and Android mobile application development',
    price: 85.00,
    unit: 'hour',
    category: 'services',
    createdAt: new Date()
  },
  {
    name: 'Database Design',
    description: 'Database architecture and design services',
    price: 65.00,
    unit: 'hour',
    category: 'services',
    createdAt: new Date()
  },
  {
    name: 'Consulting',
    description: 'Technical consulting and architecture review',
    price: 100.00,
    unit: 'hour',
    category: 'services',
    createdAt: new Date()
  }
]);

// Insert a sample client
db.clients.insertOne({
  name: 'Sample Client',
  email: 'client@example.com',
  phone: '+1-555-0123',
  address: {
    street: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345',
    country: 'USA'
  },
  createdAt: new Date()
});

print('FrikInvoice database initialized successfully!');
print('Default admin user created: username=admin, password=admin123');
print('Sample inventory items and client added.');
