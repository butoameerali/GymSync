import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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

      if (user.isBanned) {
        return res.status(403).json({ message: 'Not authorized, user account is banned' });
      }

      req.user = user;
      return next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no authentication token provided' });
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

