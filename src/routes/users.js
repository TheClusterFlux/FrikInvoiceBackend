const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticateToken, requireRole } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Get all users with pagination (admin only)
router.get('/', authenticateToken, requireRole(['admin']), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ max: 200 }).withMessage('Search term too long'),
  query('role').optional().custom((value) => {
    if (value === '' || value === undefined) return true;
    return ['clerk', 'admin'].includes(value);
  }).withMessage('Invalid role filter')
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
    const filter = {};
    
    if (req.query.role) {
      filter.role = req.query.role;
    }
    
    if (req.query.search) {
      filter.username = new RegExp(req.query.search, 'i');
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password -passwordResetToken') // Exclude sensitive fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: users,
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

// Get single user by ID (admin only)
router.get('/:id', authenticateToken, requireRole(['admin']), [
  param('id').isMongoId().withMessage('Invalid user ID')
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

    const user = await User.findById(req.params.id)
      .select('-password -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    next(error);
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireRole(['admin']), [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role').optional().isIn(['clerk', 'admin']).withMessage('Role must be clerk or admin'),
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

    const { username, password, role = 'clerk', isActive = true } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'Username already exists'
        }
      });
    }

    // Create user
    const userData = {
      username,
      password,
      role,
      isActive,
      mustResetPassword: true // Force password reset on first login
    };

    const user = new User(userData);
    await user.save();

    // Set audit context
    req.setAuditContext('User', user._id, 'create');

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        mustResetPassword: user.mustResetPassword,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('username').optional().trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('role').optional().isIn(['clerk', 'admin']).withMessage('Role must be clerk or admin'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('invoiceCode').optional().trim().matches(/^[A-Z0-9]{1,10}$/).withMessage('Invoice code must be alphanumeric and uppercase, max 10 characters')
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

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Prevent admin from deactivating themselves
    if (req.user.userId === user._id.toString() && req.body.isActive === false) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DEACTIVATE_SELF',
          message: 'Cannot deactivate your own account'
        }
      });
    }

    // Check if username is being changed and already exists
    if (req.body.username && req.body.username !== user.username) {
      const existingUser = await User.findOne({ username: req.body.username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'Username already exists'
          }
        });
      }
    }

    // Track changes for audit
    const updateData = { ...req.body, updatedBy: req.user.userId };
    Object.keys(updateData).forEach(key => {
      if (key !== 'updatedBy' && user[key] !== updateData[key]) {
        req.addAuditChange(key, user[key], updateData[key]);
      }
    });

    // Set audit context
    req.setAuditContext('User', user._id, 'update');

    Object.assign(user, updateData);
    await user.save();

    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        mustResetPassword: user.mustResetPassword,
        invoiceCode: user.invoiceCode,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    next(error);
  }
});

// Force password reset (admin only)
router.post('/:id/reset-password', authenticateToken, requireRole(['admin']), [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('newPassword')
    .optional()
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
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

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const { newPassword } = req.body;

    if (newPassword) {
      // Admin is setting a new password
      user.password = newPassword;
      user.mustResetPassword = false;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
    } else {
      // Admin is forcing user to reset their own password
      user.mustResetPassword = true;
      user.passwordResetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }

    await user.save();

    // Set audit context
    req.setAuditContext('User', user._id, 'password_reset');

    res.json({
      success: true,
      message: newPassword ? 'Password updated successfully' : 'User must reset password on next login',
      data: {
        _id: user._id,
        username: user.username,
        mustResetPassword: user.mustResetPassword
      }
    });

  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), [
  param('id').isMongoId().withMessage('Invalid user ID')
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

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Prevent admin from deleting themselves
    if (req.user.userId === user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: 'Cannot delete your own account'
        }
      });
    }

    // Set audit context
    req.setAuditContext('User', user._id, 'delete');

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get('/profile/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password -passwordResetToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    next(error);
  }
});

// Update current user password
router.put('/profile/password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
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

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect'
        }
      });
    }

    // Update password
    user.password = newPassword;
    user.mustResetPassword = false;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // Set audit context
    req.setAuditContext('User', user._id, 'password_change');

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    next(error);
  }
});

// Update own invoice code (any authenticated user)
router.put('/me/invoice-code', authenticateToken, [
  body('invoiceCode').trim().matches(/^[A-Z0-9]{1,10}$/).withMessage('Invoice code must be alphanumeric and uppercase, max 10 characters')
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

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Check if invoice code is already in use by another user
    const existingUser = await User.findOne({ 
      invoiceCode: req.body.invoiceCode,
      _id: { $ne: req.user.userId }
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVOICE_CODE_EXISTS',
          message: 'Invoice code is already in use by another user'
        }
      });
    }

    // Track changes for audit
    req.addAuditChange('invoiceCode', user.invoiceCode, req.body.invoiceCode);
    req.setAuditContext('User', user._id, 'update');

    user.invoiceCode = req.body.invoiceCode;
    await user.save();

    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        invoiceCode: user.invoiceCode,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
