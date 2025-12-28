const rateLimit = require('express-rate-limit');
const BlockedIP = require('../models/BlockedIP');

// In-memory store for tracking failed token attempts (for fishing detection)
const failedTokenAttempts = new Map();

// In-memory cache of blocked IPs (synced with MongoDB for fast lookups)
let blockedIPs = new Set();
let blocklistLoaded = false;

// Load blocklist from MongoDB on startup
const loadBlocklist = async () => {
  try {
    const blockedIPsList = await BlockedIP.find({}).select('ipAddress -_id').lean();
    blockedIPs = new Set(blockedIPsList.map(item => item.ipAddress));
    blocklistLoaded = true;
    console.log(`[SECURITY] Loaded ${blockedIPs.size} blocked IPs from MongoDB`);
  } catch (error) {
    console.error('[SECURITY] Error loading blocklist from MongoDB:', error);
    blockedIPs = new Set();
    blocklistLoaded = true; // Mark as loaded even on error to prevent retry loops
  }
};

// Ensure blocklist is loaded before checking
const ensureBlocklistLoaded = async () => {
  if (!blocklistLoaded) {
    await loadBlocklist();
  }
};

// Clean up old failed attempt tracking (not blocks, just tracking data)
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  for (const [key, data] of failedTokenAttempts.entries()) {
    const ip = key.replace('failed_token:', '');
    // Only clean up tracking data, not blocked IPs
    if (data.lastAttempt < oneHourAgo && !blockedIPs.has(ip)) {
      failedTokenAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run every hour

// Get client IP address
const getClientIp = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         'unknown';
};

// Track failed token attempt and block if threshold reached
const trackFailedAttempt = async (ip) => {
  const key = `failed_token:${ip}`;
  const now = Date.now();
  
  if (!failedTokenAttempts.has(key)) {
    failedTokenAttempts.set(key, {
      count: 0,
      firstAttempt: now,
      lastAttempt: now
    });
  }
  
  const data = failedTokenAttempts.get(key);
  data.count++;
  data.lastAttempt = now;
  
  // Permanently block IP if they have too many failed attempts
  // 5 failed attempts in 15 minutes = suspicious fishing behavior
  if (data.count >= 5 && (now - data.firstAttempt) < (15 * 60 * 1000)) {
    // Permanently block (add to MongoDB blocklist)
    if (!blockedIPs.has(ip)) {
      try {
        await BlockedIP.findOneAndUpdate(
          { ipAddress: ip },
          {
            ipAddress: ip,
            reason: 'Token fishing detected',
            blockedAt: new Date(),
            blockedBy: 'automatic',
            attemptCount: data.count,
            lastAttempt: new Date(data.lastAttempt)
          },
          { upsert: true, new: true }
        );
        
        blockedIPs.add(ip);
        console.warn(`[SECURITY] IP ${ip} PERMANENTLY BLOCKED for token fishing. ${data.count} failed attempts in ${Math.round((now - data.firstAttempt) / 1000)}s`);
      } catch (error) {
        console.error(`[SECURITY] Failed to save blocked IP ${ip} to MongoDB:`, error);
        // Still add to in-memory cache even if DB save fails
        blockedIPs.add(ip);
      }
    }
  }
  
  return data;
};

// Check if IP is blocked (checks in-memory cache first, then MongoDB if needed)
const isBlocked = async (ip) => {
  await ensureBlocklistLoaded();
  return blockedIPs.has(ip);
};

// Synchronous check for middleware (uses cache only)
const isBlockedSync = (ip) => {
  return blockedIPs.has(ip);
};

// Manually add IP to blocklist (for admin use)
const addToBlocklist = async (ip, notes = null) => {
  await ensureBlocklistLoaded();
  
  if (!blockedIPs.has(ip)) {
    try {
      await BlockedIP.findOneAndUpdate(
        { ipAddress: ip },
        {
          ipAddress: ip,
          reason: notes || 'Manually blocked',
          blockedAt: new Date(),
          blockedBy: 'manual',
          notes: notes
        },
        { upsert: true, new: true }
      );
      
      blockedIPs.add(ip);
      console.log(`[SECURITY] IP ${ip} manually added to blocklist`);
    } catch (error) {
      console.error(`[SECURITY] Failed to save manually blocked IP ${ip}:`, error);
      throw error;
    }
  }
};

// Manually remove IP from blocklist (for admin use)
const removeFromBlocklist = async (ip) => {
  await ensureBlocklistLoaded();
  
  if (blockedIPs.has(ip)) {
    try {
      await BlockedIP.deleteOne({ ipAddress: ip });
      blockedIPs.delete(ip);
      console.log(`[SECURITY] IP ${ip} removed from blocklist`);
    } catch (error) {
      console.error(`[SECURITY] Failed to remove IP ${ip} from blocklist:`, error);
      throw error;
    }
  }
};

// Get all blocked IPs (for admin use)
const getBlockedIPs = async () => {
  await ensureBlocklistLoaded();
  try {
    const blockedIPsList = await BlockedIP.find({}).sort({ blockedAt: -1 }).lean();
    return blockedIPsList;
  } catch (error) {
    console.error('[SECURITY] Error fetching blocked IPs from MongoDB:', error);
    return [];
  }
};

// Rate limiter specifically for invalid token attempts (404s)
// Only applies to failed requests, not successful ones
const invalidTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 invalid token attempts per 15 minutes
  handler: async (req, res) => {
    const ip = getClientIp(req);
    const data = await trackFailedAttempt(ip);
    
    const resetTime = req.rateLimit?.resetTime ? new Date(req.rateLimit.resetTime).toISOString() : null;
    const retryAfter = req.rateLimit?.resetTime 
      ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) 
      : null;
    
    // Log suspicious activity
    console.warn(`[SECURITY] Suspicious token fishing detected from IP ${ip}. ${data.count} failed attempts.`);
    
    res.setHeader('Retry-After', retryAfter || 900); // 15 minutes
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many invalid token attempts. This may indicate suspicious activity. Please try again later.',
        retryAfter: retryAfter || 900,
        resetTime: resetTime
      }
    });
  },
  skipSuccessfulRequests: true, // Don't count successful token lookups
  skipFailedRequests: false // Count failed attempts (404s)
});

// Middleware to check if IP is blocked from token fishing
const checkTokenFishingBlock = (req, res, next) => {
  const ip = getClientIp(req);
  
  // Use synchronous check for middleware (fast in-memory lookup)
  if (isBlockedSync(ip)) {
    console.warn(`[SECURITY] Blocked IP ${ip} attempted to access signing endpoint`);
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'IP_BLOCKED',
        message: 'This IP address has been blocked due to suspicious activity.'
      }
    });
  }
  
  next();
};

// Initialize blocklist when module loads (but wait for MongoDB connection)
// This will be called after MongoDB connects in server.js
const initializeBlocklist = async () => {
  await loadBlocklist();
};

module.exports = {
  invalidTokenLimiter,
  checkTokenFishingBlock,
  getClientIp,
  isBlocked,
  isBlockedSync,
  trackFailedAttempt,
  addToBlocklist,
  removeFromBlocklist,
  getBlockedIPs,
  loadBlocklist,
  initializeBlocklist
};
