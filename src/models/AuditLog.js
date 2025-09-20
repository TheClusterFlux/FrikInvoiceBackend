const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    enum: ['User', 'Inventory', 'Order']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'soft_delete', 'restore', 'sign']
  },
  changes: [{
    field: {
      type: String,
      required: true
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ipAddress: {
    type: String,
    maxlength: 45 // IPv6 max length
  },
  userAgent: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ createdAt: -1 });

// Static method to log changes
auditLogSchema.statics.logChange = async function({
  entityType,
  entityId,
  action,
  changes,
  userId,
  ipAddress,
  userAgent
}) {
  try {
    const auditLog = new this({
      entityType,
      entityId,
      action,
      changes,
      userId,
      ipAddress,
      userAgent
    });
    
    return await auditLog.save();
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking main operations
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);

