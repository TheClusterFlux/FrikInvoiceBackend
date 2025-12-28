const mongoose = require('mongoose');

const blockedIPSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  reason: {
    type: String,
    default: 'Token fishing detected'
  },
  blockedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  blockedBy: {
    type: String,
    enum: ['automatic', 'manual'],
    default: 'automatic'
  },
  attemptCount: {
    type: Number,
    default: 0
  },
  lastAttempt: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Ensure IP is unique
blockedIPSchema.index({ ipAddress: 1 }, { unique: true });

module.exports = mongoose.model('BlockedIP', blockedIPSchema);

