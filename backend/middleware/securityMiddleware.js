import AuditLog from '../models/AuditLog.js';

// In-memory rate limiting store
const rateLimitMap = new Map();

// Express Security Headers Middleware (Helmet Alternative)
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
};

// Rate Limiter Middleware (100 requests per 15 minutes per IP)
export const rateLimiter = (options = { windowMs: 15 * 60 * 1000, max: 100 }) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + options.windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + options.windowMs;
    } else {
      record.count += 1;
    }

    rateLimitMap.set(ip, record);

    if (record.count > options.max) {
      return res.status(429).json({
        message: 'Too many requests from this IP, please try again later.'
      });
    }

    next();
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
