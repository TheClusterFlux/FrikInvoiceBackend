const mongoose = require('mongoose');

const draftOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerInfo: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: '' }
    }
  },
  selectedClientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    default: null
  },
  items: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: false
    },
    quantity: {
      type: Number,
      default: 1
    },
    unit: {
      type: String,
      default: ''
    },
    unitPrice: {
      type: Number,
      default: 0
    },
    basePrice: {
      type: Number,
      default: 0
    },
    markup: {
      type: Number,
      default: 30
    },
    calculationBreakdown: String
  }],
  taxRate: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  lastSaved: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
draftOrderSchema.index({ userId: 1 });
draftOrderSchema.index({ lastSaved: -1 });

// Auto-delete drafts older than 30 days
draftOrderSchema.index({ lastSaved: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('DraftOrder', draftOrderSchema);
