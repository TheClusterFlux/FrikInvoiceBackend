const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
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

    // Log incoming data for debugging
    console.log('Draft save request:', {
      itemsCount: req.body.items?.length || 0,
      items: req.body.items?.map(item => ({
        hasInventoryId: !!item.inventoryId,
        inventoryId: item.inventoryId,
        inventoryIdType: typeof item.inventoryId,
        inventoryIdLength: item.inventoryId?.length
      }))
    });

    // Filter out items with empty or invalid inventoryId
    // Also ensure we only keep items that have all required fields
    const validItems = (req.body.items || []).filter(item => {
      if (!item) return false;
      const id = item.inventoryId;
      // Check if inventoryId is a valid MongoDB ObjectId (24 hex characters)
      if (!id || typeof id !== 'string') return false;
      const trimmedId = id.trim();
      if (trimmedId === '') return false;
      return mongoose.Types.ObjectId.isValid(trimmedId);
    }).map(item => {
      // Clean the item - only include fields that should be in the draft
      const cleanItem = {
        inventoryId: item.inventoryId.trim(), // Ensure it's a clean string
        quantity: item.quantity || 1,
        unit: item.unit || '',
        unitPrice: item.unitPrice || 0,
        basePrice: item.basePrice || 0,
        markup: item.markup || 30
      };
      if (item.calculationBreakdown) {
        cleanItem.calculationBreakdown = item.calculationBreakdown;
      }
      return cleanItem;
    });

    console.log('Filtered valid items:', {
      originalCount: req.body.items?.length || 0,
      validCount: validItems.length,
      validItems: validItems.map(item => ({ inventoryId: item.inventoryId, quantity: item.quantity }))
    });

    // Validate and convert selectedClientId
    let selectedClientId = null;
    if (req.body.selectedClientId) {
      if (mongoose.Types.ObjectId.isValid(req.body.selectedClientId)) {
        selectedClientId = req.body.selectedClientId; // Let Mongoose handle the conversion
      } else {
        console.warn('Invalid selectedClientId format:', req.body.selectedClientId);
      }
    }

    // Delete existing draft first to avoid any issues with old bad data
    await DraftOrder.deleteOne({ userId: req.user.userId });
    
    // Create new draft with clean data
    let draft;
    try {
      draft = new DraftOrder({
        userId: req.user.userId,
        customerInfo: req.body.customerInfo || {},
        selectedClientId: selectedClientId,
        items: validItems,
        taxRate: req.body.taxRate || 0,
        notes: req.body.notes || '',
        lastSaved: new Date()
      });
      
      await draft.save();
    } catch (saveError) {
      console.error('Draft save error:', {
        name: saveError.name,
        message: saveError.message,
        path: saveError.path,
        value: saveError.value,
        kind: saveError.kind,
        validItems: JSON.stringify(validItems, null, 2),
        validItemsCount: validItems.length,
        selectedClientId: selectedClientId
      });
      throw saveError;
    }

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
