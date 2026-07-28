import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const normalizeRole = (role = '') => role.toLowerCase().replace(/[_\s]/g, '');

const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const userName = localStorage.getItem('gymsync_user_name');
  const userRole = localStorage.getItem('gymsync_role') || 'User';
  const userInfo = localStorage.getItem('userInfo');

  const isAuthenticated = Boolean(userInfo || (userName && userName !== 'Guest User') || (userRole && userRole !== 'guest'));

  if (!isAuthenticated) {
    // Redirect unauthenticated user to auth portal / landing page
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedUserRole = normalizeRole(userRole);
    const normalizedAllowed = allowedRoles.map(normalizeRole);
    const isAllowed = normalizedAllowed.includes(normalizedUserRole) || (normalizedUserRole === 'superadmin' && normalizedAllowed.includes('admin'));

    if (!isAllowed) {
      // Instantly redirect unauthorized roles away from restricted panels
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
