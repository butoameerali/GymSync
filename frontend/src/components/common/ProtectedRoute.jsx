import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const userName = localStorage.getItem('gymsync_user_name');
  const userRole = localStorage.getItem('gymsync_role');
  const userInfo = localStorage.getItem('userInfo');

  const isAuthenticated = Boolean(userInfo || (userName && userName !== 'Guest User') || (userRole && userRole !== 'guest'));

  if (!isAuthenticated) {
    // Redirect unauthenticated user to auth portal / landing page
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
