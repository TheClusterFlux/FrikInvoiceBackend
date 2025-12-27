const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  customerInfo: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20
    },
    address: {
      street: {
        type: String,
        trim: true,
        maxlength: 200
      },
      city: {
        type: String,
        trim: true,
        maxlength: 100
      },
      state: {
        type: String,
        trim: true,
        maxlength: 100
      },
      zipCode: {
        type: String,
        trim: true,
        maxlength: 20
      },
      country: {
        type: String,
        trim: true,
        maxlength: 100
      }
    }
  },
  items: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      required: true
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    calculationBreakdown: {
      type: String,
      trim: true,
      maxlength: 200
    }
  }],
  totalQuantities: {
    type: Map,
    of: {
      total: Number,
      unit: String,
      formattedTotal: String,
      items: [{
        description: String,
        quantity: Number,
        unit: String,
        baseQuantity: Number
      }]
    },
    default: {}
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'signed', 'completed'],
    default: 'draft'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  signedAt: {
    type: Date
  },
  signedBy: {
    type: String,
    trim: true,
    maxlength: 200
  },
  // Enhanced signature metadata for legal compliance
  signatureMetadata: {
    ipAddress: String,
    userAgent: String,
    platform: String,
    language: String,
    timezone: String,
    screenResolution: String,
    consentAcknowledged: Boolean,
    documentHash: String, // Hash of order data at time of signing
    signingMethod: {
      type: String,
      enum: ['email_link', 'manual', 'api'],
      default: 'email_link'
    },
    tokenUsed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SigningToken'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
orderSchema.index({ invoiceNumber: 1 });
orderSchema.index({ isDeleted: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customerInfo.email': 1 });
orderSchema.index({ createdBy: 1 });
orderSchema.index({ 'customerInfo.name': 'text', invoiceNumber: 'text' }); // Text index for search

// Calculate totals before saving
orderSchema.pre('save', function(next) {
  try {
    if (this.items && this.items.length > 0) {
      // Validate that all items have required fields
      for (const item of this.items) {
        if (!item.inventoryId || !item.name || !item.quantity || !item.unit || item.unitPrice === undefined || item.totalPrice === undefined) {
          return next(new Error(`Invalid item: missing required fields. Item: ${JSON.stringify(item)}`));
        }
      }

      // Use the configured tax calculation method
      const { calculateTaxForItems, getTaxCalculationMethod } = require('../utils/taxCalculation');
      
      const taxMethod = getTaxCalculationMethod();
      const items = this.items.map(item => ({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        taxRate: this.taxRate || 0
      }));
      
      const taxCalculation = calculateTaxForItems(items, taxMethod);
      
      this.subtotal = taxCalculation.subtotal;
      this.taxAmount = taxCalculation.taxAmount;
      this.total = taxCalculation.total;
      
      // Calculate total quantities - wrap in try-catch in case it fails
      try {
        const { calculateTotalQuantity } = require('../utils/unitConversion');
        this.totalQuantities = calculateTotalQuantity(this.items);
      } catch (err) {
        // If totalQuantities calculation fails, set to empty map
        console.warn('Failed to calculate totalQuantities:', err.message);
        this.totalQuantities = new Map();
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Soft delete method
orderSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.updatedBy = userId;
  return this.save();
};

// Mark as signed method
orderSchema.methods.markAsSigned = function(signedBy, userId) {
  this.status = 'signed';
  this.signedAt = new Date();
  this.signedBy = signedBy;
  this.updatedBy = userId;
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);

