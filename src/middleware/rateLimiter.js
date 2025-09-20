const rateLimit = require('express-rate-limit');

// Login rate limiter - only for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again in 15 minutes.'
    }
  },
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false // Count failed login attempts
});

module.exports = {
  loginLimiter
};
