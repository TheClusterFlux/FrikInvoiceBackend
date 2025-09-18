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
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
orderSchema.index({ invoiceNumber: 1 });
orderSchema.index({ isDeleted: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

// Calculate totals before saving
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
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
    
    // Calculate total quantities
    const { calculateTotalQuantity } = require('../utils/unitConversion');
    this.totalQuantities = calculateTotalQuantity(this.items);
  }
  next();
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
