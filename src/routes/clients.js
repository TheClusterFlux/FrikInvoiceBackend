const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Client = require('../models/Client');
const AuditLog = require('../models/AuditLog');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all active clients
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
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
    
    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
        { phone: new RegExp(req.query.search, 'i') }
      ];
    }

    const [clients, total] = await Promise.all([
      Client.find(filter)
        .populate('createdBy', 'username')
        .populate('updatedBy', 'username')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Client.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: clients,
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

// Get specific client
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid client ID')
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

    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
    .populate('createdBy', 'username')
    .populate('updatedBy', 'username');

    if (!client) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Client not found'
        }
      });
    }

    res.json({
      success: true,
      data: client
    });

  } catch (error) {
    next(error);
  }
});

// Create new client
router.post('/', authenticateToken, requireRole(['clerk', 'admin']), [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Name is required and must be less than 200 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email address'),
  body('phone').optional().trim().isLength({ max: 50 }).withMessage('Phone must be less than 50 characters'),
  body('address.street').optional().trim().isLength({ max: 200 }).withMessage('Street must be less than 200 characters'),
  body('address.city').optional().trim().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
  body('address.state').optional().trim().isLength({ max: 100 }).withMessage('State must be less than 100 characters'),
  body('address.zipCode').optional().trim().isLength({ max: 20 }).withMessage('Zip code must be less than 20 characters'),
  body('address.country').optional().trim().isLength({ max: 100 }).withMessage('Country must be less than 100 characters'),
  body('taxNumber').optional().trim().isLength({ max: 50 }).withMessage('Tax number must be less than 50 characters'),
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

    const clientData = {
      ...req.body,
      createdBy: req.user.userId
    };

    const client = new Client(clientData);
    await client.save();

    // Set audit context
    req.setAuditContext('Client', client._id, 'create');

    await client.populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      data: client
    });

  } catch (error) {
    next(error);
  }
});

// Update client
router.put('/:id', authenticateToken, requireRole(['clerk', 'admin']), [
  param('id').isMongoId().withMessage('Invalid client ID'),
  body('name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Name must be less than 200 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email address'),
  body('phone').optional().trim().isLength({ max: 50 }).withMessage('Phone must be less than 50 characters'),
  body('address.street').optional().trim().isLength({ max: 200 }).withMessage('Street must be less than 200 characters'),
  body('address.city').optional().trim().isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
  body('address.state').optional().trim().isLength({ max: 100 }).withMessage('State must be less than 100 characters'),
  body('address.zipCode').optional().trim().isLength({ max: 20 }).withMessage('Zip code must be less than 20 characters'),
  body('address.country').optional().trim().isLength({ max: 100 }).withMessage('Country must be less than 100 characters'),
  body('taxNumber').optional().trim().isLength({ max: 50 }).withMessage('Tax number must be less than 50 characters'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
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

    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Client not found'
        }
      });
    }

    // Track changes for audit
    const changes = [];
    const updateData = { ...req.body, updatedBy: req.user.userId };

    Object.keys(updateData).forEach(key => {
      if (key !== 'updatedBy' && JSON.stringify(client[key]) !== JSON.stringify(updateData[key])) {
        changes.push({
          field: key,
          oldValue: client[key],
          newValue: updateData[key]
        });
        req.addAuditChange(key, client[key], updateData[key]);
      }
    });

    if (changes.length === 0) {
      return res.json({
        success: true,
        data: client,
        message: 'No changes made'
      });
    }

    // Set audit context
    req.setAuditContext('Client', client._id, 'update');

    Object.assign(client, updateData);
    await client.save();

    await client.populate('createdBy', 'username');
    await client.populate('updatedBy', 'username');

    res.json({
      success: true,
      data: client
    });

  } catch (error) {
    next(error);
  }
});

// Soft delete client
router.delete('/:id', authenticateToken, requireRole(['clerk', 'admin']), [
  param('id').isMongoId().withMessage('Invalid client ID')
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

    const client = await Client.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Client not found'
        }
      });
    }

    // Set audit context
    req.setAuditContext('Client', client._id, 'soft_delete');
    req.addAuditChange('isDeleted', false, true);

    await client.softDelete(req.user.userId);

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Get audit trail for client
router.get('/:id/audit', authenticateToken, [
  param('id').isMongoId().withMessage('Invalid client ID')
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
      entityType: 'Client', 
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

module.exports = router;
