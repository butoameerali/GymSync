import AuditLog from '../models/AuditLog.js';
import RateLimit from '../models/RateLimit.js';

// Express Security Headers Middleware (Helmet Alternative)
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Allow Google OAuth iframes (needed for Sign In with Google button)
  // res.setHeader('X-Frame-Options', 'DENY'); -- disabled: blocks Google OAuth popup
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
};

// Rate Limiter Middleware (MongoDB-backed for multi-instance correctness)
export const rateLimiter = (options = { windowMs: 15 * 60 * 1000, max: 100, scope: 'global' }) => {
  return async (req, res, next) => {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      const key = `${options.scope || 'global'}:${ip}`;
      const now = new Date();
      const resetAt = new Date(now.getTime() + options.windowMs);

      // ATOMIC INCREMENT: Attempt to atomically increment count if within current active window
      let record = await RateLimit.findOneAndUpdate(
        { key, resetAt: { $gt: now } },
        { $inc: { count: 1 } },
        { returnDocument: 'after' }
      );

      // If no active unexpired window exists, atomically upsert/reset a new window
      if (!record) {
        record = await RateLimit.findOneAndUpdate(
          { key },
          { $set: { count: 1, resetAt } },
          { upsert: true, returnDocument: 'after' }
        );
      }

      if (record && record.count > options.max) {
        return res.status(429).json({
          message: 'Too many requests, please try again later.'
        });
      }
      next();
    } catch (err) {
      // Sensitive auth endpoints fail-closed to prevent brute-force attacks during DB disruption
      if (options.scope && (options.scope.includes('auth') || options.failClosed)) {
        console.error(`[Rate Limiter Failure on ${options.scope}]:`, err.message);
        return res.status(503).json({
          message: 'Security rate limit service temporarily unavailable. Please try again shortly.'
        });
      }
      // For general non-sensitive endpoints, log warning and allow through gracefully
      console.warn(`[Rate Limiter Error (${options.scope})]:`, err.message);
      next();
    }
  };
};

// Audit Trail Middleware
export const logAuditTrail = async (user, role, action, targetEntity, details, req) => {
  try {
    const ipAddress = req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
    await AuditLog.create({
      user: user || 'System',
      role: role || 'User',
      action,
      targetEntity: targetEntity || 'N/A',
      details: details || '',
      ipAddress
    });
  } catch (err) {
    console.warn('[Audit Log Error]:', err.message);
  }
};
