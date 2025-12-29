const mongoose = require('mongoose');
const crypto = require('crypto');

const signingTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired tokens
  },
  usedAt: {
    type: Date
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  // Device information captured when token is accessed
  deviceInfo: {
    ipAddress: String,
    userAgent: String,
    platform: String,
    language: String,
    timezone: String,
    screenResolution: String,
    timestamp: Date
  },
  // Signature information
  signature: {
    signedAt: Date,
    signedBy: String,
    ipAddress: String,
    userAgent: String,
    consentAcknowledged: Boolean,
    documentHash: String // Hash of the order at time of signing for integrity
  }
}, {
  timestamps: true
});

// Generate a secure random token
signingTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Create token for an order
signingTokenSchema.statics.createForOrder = async function(orderId, email, expiresInDays = 30) {
  const token = this.generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  
  const signingToken = new this({
    token,
    orderId,
    email,
    expiresAt
  });
  
  await signingToken.save();
  return signingToken;
};

// Mark token as used
signingTokenSchema.methods.markAsUsed = function(signatureData) {
  this.isUsed = true;
  this.usedAt = new Date();
  this.signature = {
    ...signatureData,
    signedAt: new Date()
  };
  return this.save();
};

// Validate token
signingTokenSchema.methods.isValid = function() {
  if (this.isUsed) return false;
  if (this.expiresAt < new Date()) return false;
  return true;
};

module.exports = mongoose.model('SigningToken', signingTokenSchema);




