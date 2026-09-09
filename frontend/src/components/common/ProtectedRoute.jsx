import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, getRoleRedirectPath } from '../../context/AuthContext';

const normalizeRole = (role = '') => role.toLowerCase().replace(/[_\s]/g, '');

const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const token = localStorage.getItem('gymsync_token');
  const userRole = user?.role || localStorage.getItem('gymsync_role') || '';

  if (loading) return null;

  const isAuthenticated = Boolean((user || token) && userRole.toLowerCase() !== 'guest');

  if (!isAuthenticated) {
    // Redirect unauthenticated user to auth portal / landing page
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedUserRole = normalizeRole(userRole);
    const normalizedAllowed = allowedRoles.map(normalizeRole);
    const isAllowed = normalizedAllowed.includes(normalizedUserRole) || (normalizedUserRole === 'superadmin' && normalizedAllowed.includes('admin'));

    if (!isAllowed) {
      // Instantly redirect unauthorized roles away from restricted panels to their own home portal
      return <Navigate to={getRoleRedirectPath(userRole)} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
