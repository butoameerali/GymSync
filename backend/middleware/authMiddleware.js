import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - Verify JWT token or header identity
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretgymsyncjwtkey');

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User account not found' });
      }

      return next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
  }

  // Fallback for demo header user identification if bearer token not passed
  const headerUser = req.headers['x-user-name'];
  if (headerUser) {
    try {
      const user = await User.findOne({ name: headerUser }).select('-password');
      if (user) {
        req.user = user;
        return next();
      }
    } catch (err) {
      console.error('Header user lookup error:', err.message);
    }

    // Default fallback for system/admin testing headers
    let role = 'User';
    if (headerUser.toLowerCase().includes('admin')) role = 'Admin';
    else if (headerUser.toLowerCase().includes('owner')) role = 'GymOwner';
    else if (headerUser.toLowerCase().includes('store')) role = 'StoreManager';
    else if (headerUser.toLowerCase().includes('mod')) role = 'ComplaintModerator';

    req.user = { name: headerUser, role, email: `${headerUser.toLowerCase()}@gymsync.com` };
    return next();
  }

  return res.status(401).json({ message: 'Not authorized, no authentication token or user identity provided' });
};

// Authorize specific roles (RBAC)
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
