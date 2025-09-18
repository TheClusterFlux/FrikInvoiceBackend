const AuditLog = require('../models/AuditLog');

const auditLogger = (req, res, next) => {
  // Store original methods
  const originalSend = res.send;
  const originalJson = res.json;

  // Track changes for audit logging
  req.auditChanges = [];
  req.auditAction = null;
  req.auditEntityType = null;
  req.auditEntityId = null;

  // Helper function to add change to audit log
  req.addAuditChange = function(field, oldValue, newValue) {
    this.auditChanges.push({
      field,
      oldValue,
      newValue
    });
  };

  // Helper function to set audit context
  req.setAuditContext = function(entityType, entityId, action) {
    this.auditEntityType = entityType;
    this.auditEntityId = entityId;
    this.auditAction = action;
  };

  // Override res.json to log audit after successful response
  res.json = function(data) {
    // Only log if response is successful and we have audit data
    if (res.statusCode >= 200 && res.statusCode < 300 && 
        req.auditChanges.length > 0 && req.auditAction && req.user) {
      
      // Log audit asynchronously to avoid blocking response
      setImmediate(async () => {
        try {
          await AuditLog.logChange({
            entityType: req.auditEntityType,
            entityId: req.auditEntityId,
            action: req.auditAction,
            changes: req.auditChanges,
            userId: req.user.userId,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          });
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      });
    }

    // Call original json method
    return originalJson.call(this, data);
  };

  next();
};

module.exports = { auditLogger };
