const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
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
    maxlength: 255,
    validate: {
      validator: function(v) {
        return !v || /^\S+@\S+\.\S+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 50
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
  },
  taxNumber: {
    type: String,
    trim: true,
    maxlength: 50
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
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
clientSchema.index({ isDeleted: 1, isActive: 1 });
clientSchema.index({ name: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ name: 'text', email: 'text', phone: 'text' });

// Soft delete method
clientSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.updatedBy = userId;
  return this.save();
};

module.exports = mongoose.model('Client', clientSchema);
