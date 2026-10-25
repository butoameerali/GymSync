import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isSessionRevoked } from '../utils/sessionManager.js';

// Protect routes - Strict JWT-based Authentication
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Not authorized, no authentication token provided' });
      }

      if (!process.env.JWT_SECRET) {
        console.error('CRITICAL: JWT_SECRET environment variable is missing.');
        return res.status(500).json({ message: 'Server configuration error' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Check if this session has been revoked
      const revoked = await isSessionRevoked(user._id, token);
      if (revoked) {
        return res.status(401).json({ message: 'Session has been revoked or expired. Please log in again.' });
      }

      if (user.isDeleted) {
        return res.status(401).json({ message: 'Not authorized, account is scheduled for deletion' });
      }

      if (user.isBanned) {
        if (user.bannedUntil && new Date(user.bannedUntil).getTime() <= Date.now()) {
          user.isBanned = false;
          user.bannedUntil = null;
          user.banReason = '';
          user.accountStatus = user.isDeactivated ? 'Deactivated' : 'Active';
          await user.save();
        } else {
          return res.status(403).json({ 
            message: `Not authorized, user account is suspended ${user.bannedUntil ? 'until ' + new Date(user.bannedUntil).toLocaleDateString() : 'permanently'}.${user.banReason ? ' Reason: ' + user.banReason : ''}` 
          });
        }
      }

      req.user = user;
      req.token = token;
      return next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no authentication token provided' });
};

// Optional protect middleware - populates req.user if valid token provided, allows unauthenticated guests without token
export const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Not authorized, invalid token format' });
      }

      if (!process.env.JWT_SECRET) {
        console.error('CRITICAL: JWT_SECRET environment variable is missing.');
        return res.status(500).json({ message: 'Server configuration error' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      if (user.isDeleted) {
        return res.status(401).json({ message: 'Not authorized, account is deleted' });
      }
      if (user.isBanned) {
        if (user.bannedUntil && new Date(user.bannedUntil).getTime() <= Date.now()) {
          user.isBanned = false;
          user.bannedUntil = null;
          user.banReason = '';
          await user.save();
        } else {
          return res.status(403).json({ message: 'Not authorized, user account is suspended' });
        }
      }
      req.user = user;
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
    }
  }
  return next();
};

// Authorize specific roles (RBAC) - Strictly based on req.user.role from MongoDB
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userRole = req.user.role || 'User';
    const normalizedUserRole = userRole.toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());

    if (!allowedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({
        message: `Role '${userRole}' is not authorized to access this resource`
      });
    }

    next();
  };
};

// Require email verification before access
export const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      code: 'EMAIL_VERIFICATION_REQUIRED',
      message: 'Please verify your email address before accessing this protected resource.'
    });
  }
  next();
};

// Only Admin and SuperAdmin have permission to review sensitive gym verification documents
export const authorizeVerificationReviewer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const role = req.user.role || '';
  if (!['SuperAdmin', 'Admin'].includes(role)) {
    return res.status(403).json({
      message: 'Access denied: You do not have permission to view sensitive gym verification documents.'
    });
  }
  next();
};


