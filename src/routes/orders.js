const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const InvoiceCounter = require('../models/InvoiceCounter');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generatePDF } = require('../services/pdfService');
const { calculateTaxForItems, getTaxCalculationMethod } = require('../utils/taxCalculation');

const router = express.Router();

// Get all orders with pagination
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().custom((value) => {
    if (value === '' || value === undefined) return true;
    return ['draft', 'pending', 'signed', 'completed'].includes(value);
  }).withMessage('Invalid status'),
  query('search').optional().trim().isLength({ max: 200 })
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { isDeleted: false };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.search) {
      filter.$or = [
        { invoiceNumber: new RegExp(req.query.search, 'i') },
        { 'customerInfo.name': new RegExp(req.query.search, 'i') },
        { 'customerInfo.email': new RegExp(req.query.search, 'i') }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('createdBy', 'username')
        .populate('updatedBy', 'username')
        .populate('items.inventoryId', 'name sku')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: orders,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get specific order
router.get('/:id', authenticateToken, [
  param('id').isMongoId().withMessage('Invalid order ID')
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

    const order = await Order.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
    .populate('createdBy', 'username')
    .populate('updatedBy', 'username')
    .populate('items.inventoryId', 'name sku price');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    next(error);
  }
});

// Create new order
router.post('/', authenticateToken, requireRole(['clerk', 'admin']), [
  body('customerInfo.name').trim().isLength({ min: 1, max: 200 }).withMessage('Customer name is required'),
  body('customerInfo.email').optional().isEmail().withMessage('Invalid email format'),
  body('customerInfo.phone').optional().trim().isLength({ max: 20 }).withMessage('Phone must be less than 20 characters'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.inventoryId').isMongoId().withMessage('Invalid inventory ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
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

    const { items, taxRate = 0, notes } = req.body;

    // Validate inventory items and get current prices
    const orderItems = [];
    for (const item of items) {
      const inventory = await Inventory.findOne({ 
        _id: item.inventoryId, 
        isDeleted: false, 
        isActive: true 
      });

      if (!inventory) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Inventory item not found: ${item.inventoryId}`
          }
        });
      }

      orderItems.push({
        inventoryId: inventory._id,
        name: inventory.description,
        quantity: item.quantity,
        unit: inventory.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
        calculationBreakdown: item.calculationBreakdown
      });
    }

    // Calculate totals using the configured tax calculation method
    const taxMethod = getTaxCalculationMethod();
    const taxCalculation = calculateTaxForItems(
      orderItems.map(item => ({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        taxRate: taxRate
      })),
      taxMethod
    );
    
    const { subtotal, taxAmount, total } = taxCalculation;

    // Get user's invoice code and generate invoice number
    const user = await User.findById(req.user.userId);
    const userInvoiceCode = user?.invoiceCode || '01';
    const invoiceNumber = await InvoiceCounter.generateInvoiceNumber(userInvoiceCode, req.user.userId);

    // Create order
    const orderData = {
      invoiceNumber,
      customerInfo: req.body.customerInfo,
      items: orderItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes,
      createdBy: req.user.userId
    };

    const order = new Order(orderData);
    await order.save();

    // Update inventory stock
    for (const item of orderItems) {
      await Inventory.findByIdAndUpdate(
        item.inventoryId,
        { $inc: { stockQuantity: -item.quantity } }
      );
    }

    // Set audit context
    req.setAuditContext('Order', order._id, 'create');

    await order.populate('createdBy', 'username');
    await order.populate('items.inventoryId', 'name sku');

    res.status(201).json({
      success: true,
      data: order
    });

  } catch (error) {
    next(error);
  }
});

// Update order
router.put('/:id', authenticateToken, requireRole(['clerk', 'admin']), [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('customerInfo.name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Customer name must be less than 200 characters'),
  body('customerInfo.email').optional().isEmail().withMessage('Invalid email format'),
  body('customerInfo.phone').optional().trim().isLength({ max: 20 }).withMessage('Phone must be less than 20 characters'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
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

    const order = await Order.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Only allow updates for draft orders
    if (order.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_LOCKED',
          message: 'Only draft orders can be updated'
        }
      });
    }

    // Track changes for audit
    const updateData = { ...req.body, updatedBy: req.user.userId };

    Object.keys(updateData).forEach(key => {
      if (key !== 'updatedBy' && order[key] !== updateData[key]) {
        req.addAuditChange(key, order[key], updateData[key]);
      }
    });

    // Set audit context
    req.setAuditContext('Order', order._id, 'update');

    Object.assign(order, updateData);
    await order.save();

    await order.populate('createdBy', 'username');
    await order.populate('updatedBy', 'username');
    await order.populate('items.inventoryId', 'name sku');

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    next(error);
  }
});

// Soft delete order
router.delete('/:id', authenticateToken, requireRole(['clerk', 'admin']), [
  param('id').isMongoId().withMessage('Invalid order ID')
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

    const order = await Order.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Set audit context
    req.setAuditContext('Order', order._id, 'soft_delete');
    req.addAuditChange('isDeleted', false, true);

    await order.softDelete(req.user.userId);

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Generate PDF invoice
router.get('/:id/pdf', authenticateToken, [
  param('id').isMongoId().withMessage('Invalid order ID'),
  query('template').optional().isString().withMessage('Template must be a string')
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

    const order = await Order.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
    .populate('createdBy', 'username')
    .populate('items.inventoryId', 'name sku price');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    const { generatePDF } = require('../services/pdfService');
    const templateName = req.query.template || process.env.PDF_TEMPLATE || 'professional';
    
    const pdfBuffer = await generatePDF(order, templateName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${order.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PDF_GENERATION_ERROR',
        message: 'Failed to generate PDF'
      }
    });
  }
});

// Mark order as signed
router.put('/:id/sign', authenticateToken, requireRole(['clerk', 'admin']), [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('signedBy').trim().isLength({ min: 1, max: 200 }).withMessage('Signed by name is required')
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

    const order = await Order.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Set audit context
    req.setAuditContext('Order', order._id, 'sign');
    req.addAuditChange('status', order.status, 'signed');
    req.addAuditChange('signedBy', order.signedBy, req.body.signedBy);

    await order.markAsSigned(req.body.signedBy, req.user.userId);

    await order.populate('createdBy', 'username');
    await order.populate('updatedBy', 'username');
    await order.populate('items.inventoryId', 'name sku');

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    next(error);
  }
});

// Get audit trail for order
router.get('/:id/audit', authenticateToken, [
  param('id').isMongoId().withMessage('Invalid order ID')
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

    const auditLogs = await AuditLog.find({ 
      entityType: 'Order', 
      entityId: req.params.id 
    })
    .populate('userId', 'username')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      data: auditLogs
    });

  } catch (error) {
    next(error);
  }
});

// PDF Template Management Endpoints

// Get available PDF templates
router.get('/pdf/templates', authenticateToken, (req, res) => {
  try {
    const { getAvailableTemplates, getActiveTemplate } = require('../services/pdfService');
    
    res.json({
      success: true,
      data: {
        available: getAvailableTemplates(),
        active: getActiveTemplate(),
        current: process.env.PDF_TEMPLATE || 'professional'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
