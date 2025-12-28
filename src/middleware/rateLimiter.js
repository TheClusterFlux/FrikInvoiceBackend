const rateLimit = require('express-rate-limit');

// Helper function to create rate limit error response
const createRateLimitHandler = (message) => {
  return (req, res) => {
    const resetTime = req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime).toISOString() : null;
    const retryAfter = req.rateLimit?.resetTime 
      ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) 
      : null;
    
    // Add helpful headers
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
    }
    res.setHeader('X-RateLimit-Limit', req.rateLimit?.limit || 'unknown');
    res.setHeader('X-RateLimit-Remaining', req.rateLimit?.remaining || 0);
    if (resetTime) {
      res.setHeader('X-RateLimit-Reset', resetTime);
    }
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: message,
        retryAfter: retryAfter,
        resetTime: resetTime
      }
    });
  };
};

// Login rate limiter - only for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  handler: createRateLimitHandler('Too many login attempts. Please try again in 15 minutes.'),
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false // Count failed login attempts
});

// Order creation rate limiter
const orderCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 order creations per minute
  handler: createRateLimitHandler('Too many order creation requests. Please try again in a minute.')
});

// PDF generation rate limiter
const pdfGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 PDF generations per minute
  handler: createRateLimitHandler('Too many PDF generation requests. Please try again in a minute.')
});

// Email sending rate limiter
const emailSendingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 email sends per minute
  handler: createRateLimitHandler('Too many email sending requests. Please try again in a minute.')
});

// Public signing endpoint rate limiter (more restrictive for public endpoints)
const signingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 signing attempts per 15 minutes
  handler: createRateLimitHandler('Too many signing requests. Please try again in 15 minutes.')
});

module.exports = {
  loginLimiter,
  orderCreationLimiter,
  pdfGenerationLimiter,
  emailSendingLimiter,
  signingLimiter
};
