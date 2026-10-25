import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

const PRIVILEGED_ADMIN_ROLES = ['superadmin', 'admin', 'complaintmoderator', 'fitnessinstructor'];

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const stored = localStorage.getItem('gymsync_admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('gymsync_admin_token') || '';
  });

  const [loading, setLoading] = useState(true);

  // Validate session against authoritative backend /api/auth/me
  const validateSession = useCallback(async (authToken) => {
    if (!authToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) {
        throw new Error('Invalid session');
      }
      const data = await res.json();
      const roleNormalized = (data.role || '').toLowerCase().replace(/_/g, '');

      if (!PRIVILEGED_ADMIN_ROLES.includes(roleNormalized)) {
        throw new Error('Unauthorized role for admin portal');
      }

      const updatedUser = { ...data, token: authToken };
      setAdminUser(updatedUser);
      localStorage.setItem('gymsync_admin_user', JSON.stringify(updatedUser));
      localStorage.setItem('gymsync_admin_role', data.role);
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      validateSession(token);
    } else {
      setLoading(false);
    }
  }, [token, validateSession]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    if (data.requiresOtp) {
      return { requiresOtp: true, email: data.email, tempToken: data.tempToken };
    }

    const roleNormalized = (data.role || '').toLowerCase().replace(/_/g, '');
    if (!PRIVILEGED_ADMIN_ROLES.includes(roleNormalized)) {
      throw new Error('Access denied: Your account role is not authorized for the Administrative Portal.');
    }

    setToken(data.token);
    setAdminUser(data);
    localStorage.setItem('gymsync_admin_token', data.token);
    localStorage.setItem('gymsync_admin_user', JSON.stringify(data));
    localStorage.setItem('gymsync_admin_role', data.role);

    return { success: true, user: data };
  };

  const verifyOtp = async (email, otp, tempToken) => {
    const res = await fetch('/api/auth/verify-login-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, tempToken })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'OTP verification failed');
    }

    const roleNormalized = (data.role || '').toLowerCase().replace(/_/g, '');
    if (!PRIVILEGED_ADMIN_ROLES.includes(roleNormalized)) {
      throw new Error('Access denied: Your account role is not authorized for the Administrative Portal.');
    }

    setToken(data.token);
    setAdminUser(data);
    localStorage.setItem('gymsync_admin_token', data.token);
    localStorage.setItem('gymsync_admin_user', JSON.stringify(data));
    localStorage.setItem('gymsync_admin_role', data.role);

    return { success: true, user: data };
  };

  const logout = () => {
    setToken('');
    setAdminUser(null);
    localStorage.removeItem('gymsync_admin_token');
    localStorage.removeItem('gymsync_admin_user');
    localStorage.removeItem('gymsync_admin_role');
  };

  const authHeaders = () => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const value = {
    user: adminUser,
    token,
    role: adminUser?.role || '',
    isLoggedIn: Boolean(token && adminUser),
    loading,
    login,
    verifyOtp,
    logout,
    authHeaders
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
