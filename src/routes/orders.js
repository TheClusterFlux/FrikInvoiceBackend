const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const InvoiceCounter = require('../models/InvoiceCounter');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const SigningToken = require('../models/SigningToken');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { 
  orderCreationLimiter, 
  pdfGenerationLimiter, 
  emailSendingLimiter, 
  signingLimiter 
} = require('../middleware/rateLimiter');
const { 
  invalidTokenLimiter, 
  checkTokenFishingBlock, 
  getClientIp,
  trackFailedAttempt
} = require('../middleware/tokenSecurity');
const { generatePDF } = require('../services/pdfService');
const { calculateTaxForItems, getTaxCalculationMethod } = require('../utils/taxCalculation');
const { sendSigningEmail, sendInvoicePDF } = require('../services/emailService');
const crypto = require('crypto');

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
    
    // Use text search if available, otherwise fall back to regex for backward compatibility
    let sortOptions = { createdAt: -1 };
    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      if (searchTerm) {
        // Try text search first (more efficient with indexes)
        // If text index exists, use it; otherwise fall back to regex
        try {
          filter.$text = { $search: searchTerm };
          sortOptions = { score: { $meta: 'textScore' }, createdAt: -1 };
        } catch (error) {
          // Fall back to regex if text index is not available
          filter.$or = [
            { invoiceNumber: new RegExp(searchTerm, 'i') },
            { 'customerInfo.name': new RegExp(searchTerm, 'i') },
            { 'customerInfo.email': new RegExp(searchTerm, 'i') }
          ];
          delete filter.$text;
        }
      }
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('createdBy', 'username')
        .populate('updatedBy', 'username')
        .populate('items.inventoryId', 'name sku')
        .sort(sortOptions)
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
router.post('/', orderCreationLimiter, authenticateToken, requireRole(['clerk', 'admin']), [
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

    // Filter out any items with invalid inventoryId (defensive programming)
    const validItems = (items || []).filter(item => {
      if (!item || !item.inventoryId) return false;
      return mongoose.Types.ObjectId.isValid(item.inventoryId);
    });

    if (validItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No valid items provided. All items must have a valid inventory ID.'
        }
      });
    }

    // Validate inventory items and get current prices
    const orderItems = [];
    for (const item of validItems) {
      // First try to find the item (without isActive filter - we don't care if it's active or not)
      let inventory = await Inventory.findOne({ 
        _id: item.inventoryId, 
        isDeleted: false
      });

      if (!inventory) {
        // Try to find the item even if deleted to get its code for a better error message
        const deletedInventory = await Inventory.findOne({ _id: item.inventoryId });
        if (deletedInventory) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `Inventory item "${deletedInventory.code} - ${deletedInventory.description}" was deleted and cannot be used in orders`
            }
          });
        }
        
        // Item doesn't exist at all - provide a helpful error message
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Inventory item with ID "${item.inventoryId}" not found. Please select a valid item from the inventory.`
          }
        });
      }

      // Truncate calculationBreakdown if it exceeds maxlength (200)
      let calculationBreakdown = item.calculationBreakdown;
      if (calculationBreakdown && calculationBreakdown.length > 200) {
        calculationBreakdown = calculationBreakdown.substring(0, 197) + '...';
      }

      orderItems.push({
        inventoryId: inventory._id,
        code: inventory.code, // Store inventory code for static invoice data
        name: inventory.description,
        quantity: item.quantity,
        unit: inventory.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
        calculationBreakdown: calculationBreakdown || undefined // Only include if present
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

    // Validate the order data before saving
    const order = new Order(orderData);
    
    // Validate synchronously to catch errors early
    const validationError = order.validateSync();
    if (validationError) {
      console.error('Mongoose validation error:', JSON.stringify(validationError.errors, null, 2));
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Order validation failed',
          details: Object.keys(validationError.errors || {}).map(key => ({
            field: key,
            message: validationError.errors[key].message,
            value: validationError.errors[key].value
          }))
        }
      });
    }
    
    try {
      await order.save();
    } catch (saveError) {
      console.error('Order save error:', {
        name: saveError.name,
        code: saveError.code,
        message: saveError.message,
        errInfo: saveError.errInfo,
        orderData: {
          invoiceNumber: orderData.invoiceNumber,
          itemCount: orderData.items.length,
          items: orderData.items.map(item => ({
            inventoryId: item.inventoryId?.toString(),
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          })),
          subtotal: orderData.subtotal,
          taxAmount: orderData.taxAmount,
          total: orderData.total
        }
      });
      throw saveError;
    }

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
router.get('/:id/pdf', pdfGenerationLimiter, authenticateToken, [
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

// Send signing email to customer
router.post('/:id/send-signing-email', emailSendingLimiter, authenticateToken, requireRole(['clerk', 'admin']), [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('email').optional().isEmail().withMessage('Invalid email format')
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

    // Use provided email or order email
    const email = req.body.email || order.customerInfo.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_EMAIL',
          message: 'Email address is required. Please provide an email or ensure the order has a customer email.'
        }
      });
    }

    // Check if order is in a signable state
    if (order.status === 'signed' || order.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_ALREADY_SIGNED',
          message: 'This order has already been signed'
        }
      });
    }

    // Create or get existing valid token
    let signingToken = await SigningToken.findOne({
      orderId: order._id,
      email: email.toLowerCase(),
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!signingToken) {
      signingToken = await SigningToken.createForOrder(order._id, email.toLowerCase(), 30);
    }

    // Generate signing URL
    // In production, FRONTEND_URL must be set (enforced by server.js startup check)
    let baseUrl;
    if (process.env.NODE_ENV === 'production') {
      baseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL;
      if (!baseUrl) {
        throw new Error('FRONTEND_URL environment variable is required in production');
      }
    } else {
      // Development: fallback to localhost
      baseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL || 'http://localhost:3000';
    }
    const signingUrl = `${baseUrl}/sign/${signingToken.token}`;

    // Send email
    try {
      await sendSigningEmail({
        to: email,
        orderNumber: order.invoiceNumber,
        signingUrl,
        customerName: order.customerInfo.name,
        invoiceTotal: order.total
      });

      // Update order status to pending if it's draft
      if (order.status === 'draft') {
        order.status = 'pending';
        await order.save();
      }

      // Set audit context
      req.setAuditContext('Order', order._id, 'send_signing_email');
      req.addAuditChange('status', order.status, 'pending');

      res.json({
        success: true,
        message: 'Signing email sent successfully',
        data: {
          email,
          tokenId: signingToken._id,
          expiresAt: signingToken.expiresAt
        }
      });
    } catch (emailError) {
      console.error('Failed to send signing email:', emailError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: 'Failed to send signing email',
          details: emailError.message
        }
      });
    }

  } catch (error) {
    next(error);
  }
});

// Public endpoint: Get order by signing token (no auth required)
// Apply security checks: block fishing attempts, rate limit ONLY invalid tokens
router.get('/sign/:token', 
  checkTokenFishingBlock, // Check if IP is blocked for fishing
  invalidTokenLimiter, // Rate limit ONLY invalid tokens (not valid ones)
  [
  param('token').isLength({ min: 64, max: 64 }).withMessage('Invalid token format')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Track invalid token format attempts (fishing)
      const ip = getClientIp(req);
      const failedData = await trackFailedAttempt(ip);
      
      if (failedData.count >= 3) {
        console.warn(`[SECURITY] Token format fishing detected from IP ${ip}. ${failedData.count} failed attempts.`);
      }
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid token',
          details: errors.array()
        }
      });
    }

    const signingToken = await SigningToken.findOne({ token: req.params.token })
      .populate('orderId');

    if (!signingToken) {
      // Track failed token lookup (fishing attempt)
      const ip = getClientIp(req);
      const failedData = await trackFailedAttempt(ip);
      
      // Log suspicious activity if multiple failures
      if (failedData.count >= 3) {
        console.warn(`[SECURITY] Token fishing detected from IP ${ip}. ${failedData.count} failed attempts. Token: ${req.params.token.substring(0, 8)}...`);
      }
      
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOKEN_NOT_FOUND',
          message: 'Invalid or expired signing link'
        }
      });
    }

    if (!signingToken.isValid()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: signingToken.isUsed ? 'This signing link has already been used' : 'This signing link has expired'
        }
      });
    }

    const order = signingToken.orderId;
    if (order.isDeleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Capture device information
    const deviceInfo = {
      ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      platform: req.headers['sec-ch-ua-platform'] || 'unknown',
      language: req.headers['accept-language'] || 'unknown',
      timezone: req.headers['timezone'] || 'unknown',
      screenResolution: req.headers['screen-resolution'] || 'unknown',
      timestamp: new Date()
    };

    // Update token with device info (but don't mark as used yet)
    if (!signingToken.deviceInfo || !signingToken.deviceInfo.ipAddress) {
      signingToken.deviceInfo = deviceInfo;
      await signingToken.save();
    }

    // Populate order details
    await order.populate('createdBy', 'username');
    await order.populate('items.inventoryId', 'name sku price');

    res.json({
      success: true,
      data: {
        order,
        token: {
          email: signingToken.email,
          expiresAt: signingToken.expiresAt
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Public endpoint: Accept/sign order via token (no auth required)
router.post('/sign/:token/accept', 
  checkTokenFishingBlock, // Check if IP is blocked for fishing
  [
  param('token').isLength({ min: 64, max: 64 }).withMessage('Invalid token format'),
  body('signedBy').trim().isLength({ min: 1, max: 200 }).withMessage('Signature name is required'),
  body('consentAcknowledged').custom((value) => {
    // Accept both string 'true' and boolean true
    return value === true || value === 'true';
  }).withMessage('Consent must be acknowledged')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Track invalid token format attempts (fishing)
      const ip = getClientIp(req);
      const failedData = await trackFailedAttempt(ip);
      
      if (failedData.count >= 3) {
        console.warn(`[SECURITY] Token format fishing detected from IP ${ip} on accept endpoint. ${failedData.count} failed attempts.`);
      }
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const signingToken = await SigningToken.findOne({ token: req.params.token })
      .populate('orderId');

    if (!signingToken) {
      // Track failed token lookup (fishing attempt)
      const ip = getClientIp(req);
      const failedData = await trackFailedAttempt(ip);
      
      if (failedData.count >= 3) {
        console.warn(`[SECURITY] Token fishing detected from IP ${ip} on accept endpoint. ${failedData.count} failed attempts. Token: ${req.params.token.substring(0, 8)}...`);
      }
      
      return res.status(404).json({
        success: false,
        error: {
          code: 'TOKEN_NOT_FOUND',
          message: 'Invalid or expired signing link'
        }
      });
    }

    if (!signingToken.isValid()) {
      // Track invalid token attempts (expired/used)
      const ip = getClientIp(req);
      const failedData = await trackFailedAttempt(ip);
      
      if (failedData.count >= 3) {
        console.warn(`[SECURITY] Invalid token access attempt from IP ${ip}. ${failedData.count} failed attempts. Token: ${req.params.token.substring(0, 8)}...`);
      }
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: signingToken.isUsed ? 'This signing link has already been used' : 'This signing link has expired'
        }
      });
    }

    const order = signingToken.orderId;
    if (order.isDeleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    if (order.status === 'signed' || order.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_ALREADY_SIGNED',
          message: 'This order has already been signed'
        }
      });
    }

    // Generate document hash for integrity verification
    const documentData = JSON.stringify({
      invoiceNumber: order.invoiceNumber,
      customerInfo: order.customerInfo,
      items: order.items,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      total: order.total,
      createdAt: order.createdAt
    });
    const documentHash = crypto.createHash('sha256').update(documentData).digest('hex');

    // Capture signature information
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const signatureData = {
      signedBy: req.body.signedBy.trim(),
      ipAddress,
      userAgent,
      consentAcknowledged: true,
      documentHash
    };

    // Mark token as used
    await signingToken.markAsUsed(signatureData);

    // Update order with signature
    order.status = 'signed';
    order.signedAt = new Date();
    order.signedBy = signatureData.signedBy;
    order.signatureMetadata = {
      ipAddress,
      userAgent,
      platform: req.headers['sec-ch-ua-platform'] || 'unknown',
      language: req.headers['accept-language'] || 'unknown',
      timezone: req.headers['timezone'] || 'unknown',
      screenResolution: req.headers['screen-resolution'] || 'unknown',
      consentAcknowledged: true,
      documentHash,
      signingMethod: 'email_link',
      tokenUsed: signingToken._id
    };
    await order.save();

    // Populate order details for response
    await order.populate('createdBy', 'username');
    await order.populate('items.inventoryId', 'name sku price');

    res.json({
      success: true,
      message: 'Order signed successfully',
      data: {
        order,
        signature: {
          signedAt: order.signedAt,
          signedBy: order.signedBy,
          documentHash: order.signatureMetadata.documentHash
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Send invoice PDF via email (public endpoint - for signed invoices)
router.post('/:id/send-pdf-email', [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('email').optional().isEmail().withMessage('Invalid email address')
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

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Use provided email or order email
    const email = req.body.email || order.customerInfo.email;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_REQUIRED',
          message: 'Email address is required. Please provide an email or ensure the order has a customer email.'
        }
      });
    }

    // Generate and send PDF
    try {
      await sendInvoicePDF({
        to: email,
        orderNumber: order.invoiceNumber,
        customerName: order.customerInfo.name,
        orderId: order._id,
        templateName: 'signing-screen'
      });

      res.json({
        success: true,
        message: 'Invoice PDF sent successfully',
        data: {
          email
        }
      });
    } catch (emailError) {
      console.error('Failed to send invoice PDF email:', emailError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: 'Failed to send invoice PDF email',
          details: emailError.message
        }
      });
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;
