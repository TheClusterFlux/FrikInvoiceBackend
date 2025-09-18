const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 50
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  group: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  isActive: {
    type: Boolean,
    default: true
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
  }
}, {
  timestamps: true
});

// Index for efficient queries
inventorySchema.index({ isDeleted: 1, isActive: 1 });
inventorySchema.index({ code: 1 });
inventorySchema.index({ group: 1 });
inventorySchema.index({ description: 'text', code: 'text' });

// Soft delete method
inventorySchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.updatedBy = userId;
  return this.save();
};

// Restore method
inventorySchema.methods.restore = function(userId) {
  this.isDeleted = false;
  this.updatedBy = userId;
  return this.save();
};

module.exports = mongoose.model('Inventory', inventorySchema);
