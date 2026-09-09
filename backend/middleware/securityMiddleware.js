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

      const existing = await RateLimit.findOne({ key });
      if (!existing || existing.resetAt <= now) {
        await RateLimit.findOneAndUpdate(
          { key },
          { $set: { count: 1, resetAt } },
          { upsert: true, returnDocument: 'after' }
        );
      } else {
        const updated = await RateLimit.findOneAndUpdate(
          { key },
          { $inc: { count: 1 } },
          { returnDocument: 'after' }
        );
        if (updated && updated.count > options.max) {
          return res.status(429).json({
            message: 'Too many requests from this IP, please try again later.'
          });
        }
      }
      next();
    } catch (err) {
      // In case of DB error during rate limit check, allow request through gracefully
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
