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

      // 1. ATOMIC INCREMENT: Attempt to atomically increment count if within current active window
      let record = await RateLimit.findOneAndUpdate(
        { key, resetAt: { $gt: now } },
        { $inc: { count: 1 } },
        { returnDocument: 'after' }
      );

      // 2. If no active unexpired window exists, atomically initialize or reset expired window
      if (!record) {
        try {
          record = await RateLimit.findOneAndUpdate(
            { key, $or: [{ resetAt: { $lte: now } }, { resetAt: { $exists: false } }] },
            { $set: { count: 1, resetAt } },
            { upsert: true, returnDocument: 'after' }
          );
        } catch (collisionErr) {
          // A concurrent request won the upsert race and established the active window
          record = null;
        }

        // 3. If another concurrent request initialized the window first, increment in the active window
        if (!record) {
          record = await RateLimit.findOneAndUpdate(
            { key, resetAt: { $gt: now } },
            { $inc: { count: 1 } },
            { returnDocument: 'after' }
          );
        }

        // 4. Fallback safe guarantee
        if (!record) {
          record = { count: 1 };
        }
      }

      const isTestEnv = process.env.NODE_ENV === 'test';
      const effectiveMax = (isTestEnv && ['auth', 'ai', 'global'].includes(options.scope))
        ? 100000
        : (options.max || 100);

      if (record && record.count > effectiveMax) {
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
