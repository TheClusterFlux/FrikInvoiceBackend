const express = require('express');
const { body, validationResult } = require('express-validator');
const DraftOrder = require('../models/DraftOrder');
const { authenticateToken } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');

const router = express.Router();

// Apply authentication and audit logging to all routes
router.use(authenticateToken);
router.use(auditLogger);

// Get user's draft order (only one per user)
router.get('/', async (req, res, next) => {
  try {
    const draft = await DraftOrder.findOne({ userId: req.user.userId })
      .populate('selectedClientId', 'name email phone address')
      .populate('items.inventoryId', 'code description unit group basePrice')
      .sort({ lastSaved: -1 });

    res.json({
      success: true,
      data: draft
    });
  } catch (error) {
    next(error);
  }
});

// Save/update draft order
router.post('/', [
  body('customerInfo.name').optional().trim().isLength({ max: 200 }),
  body('customerInfo.email').optional().trim().isEmail().normalizeEmail(),
  body('customerInfo.phone').optional().trim().isLength({ max: 20 }),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }),
  body('notes').optional().trim().isLength({ max: 1000 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const draftData = {
      userId: req.user.userId,
      customerInfo: req.body.customerInfo || {},
      selectedClientId: req.body.selectedClientId || null,
      items: req.body.items || [],
      taxRate: req.body.taxRate || 0,
      notes: req.body.notes || '',
      lastSaved: new Date()
    };

    // Upsert: update if exists, create if not
    const draft = await DraftOrder.findOneAndUpdate(
      { userId: req.user.userId },
      draftData,
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );

    req.setAuditContext('DraftOrder', draft._id, 'save');

    res.json({
      success: true,
      data: draft,
      message: 'Draft saved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Delete draft order
router.delete('/', async (req, res, next) => {
  try {
    const draft = await DraftOrder.findOneAndDelete({ userId: req.user.userId });
    
    if (draft) {
      req.setAuditContext('DraftOrder', draft._id, 'delete');
    }

    res.json({
      success: true,
      message: 'Draft deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
