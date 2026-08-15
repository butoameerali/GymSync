import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const getRoleRedirectPath = (role) => {
  if (!role) return '/home';
  const normalized = role.toLowerCase().replace(/[_\s]/g, '');
  if (normalized === 'admin' || normalized === 'superadmin' || normalized === 'complaintmoderator') {
    return '/admin';
  }
  if (normalized === 'gymowner') {
    return '/gym-owner';
  }
  if (normalized === 'fitnessinstructor') {
    return '/fitness-instructor';
  }
  if (normalized === 'gymtrainer') {
    return '/gym-trainer';
  }
  return '/home'; // Standard user redirects to Homepage feed
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in via token or localStorage metadata
    const token = localStorage.getItem('gymsync_token');
    const role = localStorage.getItem('gymsync_role');
    const name = localStorage.getItem('gymsync_user_name');
    const userInfoStr = localStorage.getItem('userInfo');

    if (userInfoStr && userInfoStr !== 'undefined' && userInfoStr !== 'null') {
      try {
        setUser(JSON.parse(userInfoStr));
      } catch (e) {
        if (token && role && role !== 'guest') {
          setUser({ name, role, token });
        } else {
          setUser(null);
        }
      }
    } else if (token && role && role !== 'guest') {
      setUser({ name, role, token });
    } else {
      setUser(null);
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await axios.post('/api/auth/login', { email, password }, config);

      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      localStorage.setItem('gymsync_token', data.token || 'mocktoken');
      localStorage.setItem('gymsync_role', data.role || 'User');
      localStorage.setItem('gymsync_user_name', data.name || 'User');

      return { success: true, user: data, redirectPath: getRoleRedirectPath(data.role) };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await axios.post('/api/auth/register', { name, email, password, role }, config);

      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      localStorage.setItem('gymsync_token', data.token || 'mocktoken');
      localStorage.setItem('gymsync_role', data.role || 'User');
      localStorage.setItem('gymsync_user_name', data.name || 'User');

      return { success: true, user: data, redirectPath: getRoleRedirectPath(data.role) };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('gymsync_token');
    localStorage.removeItem('gymsync_role');
    localStorage.removeItem('gymsync_user_name');
    localStorage.removeItem('gymsync_subscribed');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, getRoleRedirectPath }}>
      {children}
    </AuthContext.Provider>
  );
};
