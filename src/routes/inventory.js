const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for CSV uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all inventory items
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
  query('group').optional().trim().isLength({ max: 100 }),
  query('search').optional().trim().isLength({ max: 200 }),
  query('sortField').optional().trim().isLength({ max: 50 }),
  query('sortDirection').optional().isIn(['asc', 'desc']).withMessage('Sort direction must be asc or desc'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
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
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const skip = limit ? (page - 1) * limit : 0;

    // Build filter
    const filter = { isDeleted: false };
    
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.group) {
      filter.group = new RegExp(req.query.group, 'i');
    }
    
    if (req.query.search) {
      filter.$or = [
        { description: new RegExp(req.query.search, 'i') },
        { code: new RegExp(req.query.search, 'i') },
        { group: new RegExp(req.query.search, 'i') }
      ];
    }

    // Build sort object
    let sortObj = { createdAt: -1 }; // Default sort
    if (req.query.sortField && req.query.sortDirection) {
      const direction = req.query.sortDirection === 'asc' ? 1 : -1;
      sortObj = { [req.query.sortField]: direction };
    }

    const query = Inventory.find(filter)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .sort(sortObj)
      .skip(skip);

    // Only apply limit if specified
    if (limit) {
      query.limit(limit);
    }

    const [inventory, total] = await Promise.all([
      query,
      Inventory.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: inventory,
      meta: {
        total,
        page,
        limit: limit || total, // Show total as limit when no limit specified
        pages: limit ? Math.ceil(total / limit) : 1
      }
    });

  } catch (error) {
    next(error);
  }
});

// Get specific inventory item
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid inventory ID')
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

    const inventory = await Inventory.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    })
    .populate('createdBy', 'username')
    .populate('updatedBy', 'username');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }

    res.json({
      success: true,
      data: inventory
    });

  } catch (error) {
    next(error);
  }
});

// Create new inventory item
router.post('/', authenticateToken, requireRole(['clerk', 'admin']), [
  body('code').trim().isLength({ min: 1, max: 50 }).withMessage('Code is required and must be less than 50 characters'),
  body('description').trim().isLength({ min: 1, max: 200 }).withMessage('Description is required and must be less than 200 characters'),
  body('group').trim().isLength({ min: 1, max: 100 }).withMessage('Group is required and must be less than 100 characters'),
  body('unit').trim().isLength({ min: 1, max: 50 }).withMessage('Unit is required and must be less than 50 characters'),
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a non-negative number')
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

    const inventoryData = {
      ...req.body,
      createdBy: req.user.userId
    };

    const inventory = new Inventory(inventoryData);
    await inventory.save();

    // Set audit context
    req.setAuditContext('Inventory', inventory._id, 'create');

    await inventory.populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      data: inventory
    });

  } catch (error) {
    next(error);
  }
});

// Update inventory item
router.put('/:id', authenticateToken, requireRole(['clerk', 'admin']), [
  param('id').isMongoId().withMessage('Invalid inventory ID'),
  body('code').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Code must be less than 50 characters'),
  body('description').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Description must be less than 200 characters'),
  body('group').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Group must be less than 100 characters'),
  body('unit').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Unit must be less than 50 characters'),
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be a non-negative number'),
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

    const inventory = await Inventory.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }

    // Track changes for audit
    const changes = [];
    const updateData = { ...req.body, updatedBy: req.user.userId };

    Object.keys(updateData).forEach(key => {
      if (key !== 'updatedBy' && inventory[key] !== updateData[key]) {
        changes.push({
          field: key,
          oldValue: inventory[key],
          newValue: updateData[key]
        });
        req.addAuditChange(key, inventory[key], updateData[key]);
      }
    });

    if (changes.length === 0) {
      return res.json({
        success: true,
        data: inventory,
        message: 'No changes made'
      });
    }

    // Set audit context
    req.setAuditContext('Inventory', inventory._id, 'update');

    Object.assign(inventory, updateData);
    await inventory.save();

    await inventory.populate('createdBy', 'username');
    await inventory.populate('updatedBy', 'username');

    res.json({
      success: true,
      data: inventory
    });

  } catch (error) {
    next(error);
  }
});

// Soft delete inventory item
router.delete('/:id', authenticateToken, requireRole(['clerk', 'admin']), [
  param('id').isMongoId().withMessage('Invalid inventory ID')
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

    const inventory = await Inventory.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }

    // Set audit context
    req.setAuditContext('Inventory', inventory._id, 'soft_delete');
    req.addAuditChange('isDeleted', false, true);

    await inventory.softDelete(req.user.userId);

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Get audit trail for inventory item
router.get('/:id/audit', authenticateToken, [
  param('id').isMongoId().withMessage('Invalid inventory ID')
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
      entityType: 'Inventory', 
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

// Export inventory to CSV
router.get('/export/csv', authenticateToken, requireRole(['clerk', 'admin']), async (req, res, next) => {
  try {
    const inventory = await Inventory.find({ isDeleted: false })
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .sort({ code: 1 });

    const csvData = inventory.map(item => ({
      code: item.code,
      description: item.description,
      group: item.group,
      unit: item.unit,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      createdBy: item.createdBy?.username || '',
      updatedBy: item.updatedBy?.username || ''
    }));

    const csvWriter = createObjectCsvWriter({
      path: 'temp_inventory_export.csv',
      header: [
        { id: 'code', title: 'Code' },
        { id: 'description', title: 'Description' },
        { id: 'group', title: 'Group' },
        { id: 'unit', title: 'Unit' },
        { id: 'isActive', title: 'Is Active' },
        { id: 'createdAt', title: 'Created At' },
        { id: 'updatedAt', title: 'Updated At' },
        { id: 'createdBy', title: 'Created By' },
        { id: 'updatedBy', title: 'Updated By' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_export.csv"');
    
    // Read the file and send it
    const fs = require('fs');
    const fileContent = fs.readFileSync('temp_inventory_export.csv');
    res.send(fileContent);
    
    // Clean up temp file
    fs.unlinkSync('temp_inventory_export.csv');

  } catch (error) {
    next(error);
  }
});

// Import inventory from CSV
router.post('/import/csv', authenticateToken, requireRole(['clerk', 'admin']), upload.single('csvFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'CSV file is required'
        }
      });
    }

    const csvData = [];
    const errors = [];
    const results = {
      imported: 0,
      updated: 0,
      errors: 0,
      details: []
    };

    // Parse CSV
    const csvContent = req.file.buffer.toString('utf8');
    const lines = csvContent.split('\n').filter(line => line.trim()); // Remove empty lines
    
    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'CSV file must contain at least a header row and one data row'
        }
      });
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    
    // Validate headers
    const requiredHeaders = ['code', 'description', 'group', 'unit'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Missing required headers: ${missingHeaders.join(', ')}. Found headers: ${headers.join(', ')}`
        }
      });
    }

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Better CSV parsing - handle quoted fields
      const values = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim()); // Add the last value
      
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });

      // Validate required fields
      const validationErrors = [];
      if (!rowData.code) validationErrors.push('Code is required');
      if (!rowData.description) validationErrors.push('Description is required');
      if (!rowData.group) validationErrors.push('Group is required');
      if (!rowData.unit) validationErrors.push('Unit is required');

      if (validationErrors.length > 0) {
        results.errors++;
        results.details.push({
          row: i + 1,
          code: rowData.code || 'N/A',
          errors: validationErrors
        });
        continue;
      }

      // Prepare data
      const inventoryData = {
        code: rowData.code.toUpperCase(),
        description: rowData.description,
        group: rowData.group,
        unit: rowData.unit,
        isActive: rowData.isActive === 'true' || rowData.isActive === '1' || rowData.isActive === '',
        createdBy: req.user.userId
      };

      try {
        // Check if item exists
        const existingItem = await Inventory.findOne({ 
          code: inventoryData.code, 
          isDeleted: false 
        });

        if (existingItem) {
          // Update existing item
          Object.assign(existingItem, inventoryData);
          existingItem.updatedBy = req.user.userId;
          await existingItem.save();
          results.updated++;
          results.details.push({
            row: i + 1,
            code: inventoryData.code,
            action: 'updated'
          });
        } else {
          // Create new item
          const newItem = new Inventory(inventoryData);
          await newItem.save();
          results.imported++;
          results.details.push({
            row: i + 1,
            code: inventoryData.code,
            action: 'created'
          });
        }
      } catch (dbError) {
        results.errors++;
        let errorMessage = 'Database error';
        
        if (dbError.code === 11000) {
          errorMessage = `Duplicate code: ${inventoryData.code} already exists`;
        } else if (dbError.name === 'ValidationError') {
          errorMessage = `Validation error: ${Object.values(dbError.errors).map(e => e.message).join(', ')}`;
        } else {
          errorMessage = dbError.message;
        }
        
        results.details.push({
          row: i + 1,
          code: inventoryData.code,
          errors: [errorMessage]
        });
      }
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;

