import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, Briefcase, ArrowRight } from 'lucide-react';
import { getRoleRedirectPath } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './AuthPortal.css';

const AuthPortal = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' // 'user' or 'gym_owner'
  });
  const [error, setError] = useState('');
  
  const token = localStorage.getItem('gymsync_token');
  const role = localStorage.getItem('gymsync_role');
  const isLoggedIn = Boolean(token && role && role !== 'guest');

  const [isAuthenticating, setIsAuthenticating] = useState(isLoggedIn);
  const navigate = useNavigate();

  // Auto-login & role-based redirect check (prevents UI login flash)
  useEffect(() => {
    if (isLoggedIn) {
      const redirectPath = getRoleRedirectPath(role);
      navigate(redirectPath, { replace: true });
    } else {
      setIsAuthenticating(false);
    }
  }, [isLoggedIn, role, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      // Map frontend roles to backend Enums
      let backendRole = 'User';
      if (formData.role === 'gym_owner') backendRole = 'GymOwner';

      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { ...formData, role: backendRole };

      if (payload.name) payload.name = payload.name.trim(); // Prevent whitespace corruption

      const res = await fetch(`${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Store auth data in localStorage
      localStorage.setItem('gymsync_token', data.token);
      localStorage.setItem('gymsync_role', data.role);
      localStorage.setItem('gymsync_user_name', data.name);
      localStorage.setItem('userInfo', JSON.stringify(data));
      
      // --- Offline Guest Migration Sweep ---
      const guestHistory = localStorage.getItem('gymsync_Guest_User_history');
      if (guestHistory) {
         const newKeyName = data.name.replace(/\s+/g, '_');
         
         const existingUserHistoryStr = localStorage.getItem(`gymsync_${newKeyName}_history`);
         let mergedHistory = JSON.parse(guestHistory);
         
         if (existingUserHistoryStr) {
            const existingHistory = JSON.parse(existingUserHistoryStr);
            mergedHistory = [...existingHistory, ...mergedHistory];
         }
         
         localStorage.setItem(`gymsync_${newKeyName}_history`, JSON.stringify(mergedHistory));
         
         const guestBio = localStorage.getItem('gymsync_Guest_User_bio_data');
         if (guestBio && !localStorage.getItem(`gymsync_${newKeyName}_bio_data`)) {
             localStorage.setItem(`gymsync_${newKeyName}_bio_data`, guestBio);
         }
         
         const guestPoints = localStorage.getItem('gymsync_Guest_User_points');
         const guestStreak = localStorage.getItem('gymsync_Guest_User_streak');
         if (guestPoints) localStorage.setItem(`gymsync_${newKeyName}_points`, guestPoints);
         if (guestStreak) localStorage.setItem(`gymsync_${newKeyName}_streak`, guestStreak);

         localStorage.removeItem('gymsync_Guest_User_history');
         localStorage.removeItem('gymsync_Guest_User_bio_data');
         localStorage.removeItem('gymsync_Guest_User_points');
         localStorage.removeItem('gymsync_Guest_User_streak');
      }
      
      // Dynamic Role-Based Redirection on Login
      const redirectPath = getRoleRedirectPath(data.role);
      window.location.href = redirectPath;
      
    } catch (err) {
      if (err.message.includes('Failed to fetch')) {
        console.warn("Backend unreachable, simulating mock login for FYP demonstration.");
        const mockRole = formData.role === 'gym_owner' ? 'GymOwner' : 'User';
        localStorage.setItem('gymsync_token', 'mock_token');
        localStorage.setItem('gymsync_role', mockRole);
        localStorage.setItem('gymsync_user_name', formData.name || 'Demo User');
        window.location.href = getRoleRedirectPath(mockRole);
      } else {
        setError(err.message);
      }
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem('gymsync_role', 'guest');
    localStorage.setItem('gymsync_user_name', 'Guest');
    localStorage.removeItem('gymsync_token');
    window.location.href = '/home';
  };

  // If already authenticated, show loading spinner while redirecting (prevents login UI flash)
  if (isAuthenticating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-color)' }}>
        <LoadingSpinner size="large" message="Verifying GymSync session & loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="auth-portal">
      <div className="auth-container">
        {/* Left Side: Brand Message */}
        <div className="auth-brand">
          <div className="brand-header">
            <Activity className="brand-logo" size={48} />
            <h1 className="brand-title">GymSync</h1>
          </div>
          <p className="brand-subtitle">
            Connect with gyms, track your workouts, leverage AI training, and join a passionate fitness community.
          </p>
          <div className="brand-features">
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>AI-Powered Exercise Form & Rep Counter</span>
            </div>
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Explore Top Local Gyms & Membership Plans</span>
            </div>
            <div className="feature-item">
              <div className="feature-dot"></div>
              <span>Social Fitness Community & Progress Tracking</span>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form Card */}
        <div className="auth-card glass-panel">
          <div className="auth-header">
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{isLogin ? 'Log in to access your fitness hub' : 'Join GymSync today'}</p>
          </div>

          {error && <div className="auth-error-banner">{error}</div>}

          <form onSubmit={handleAuth} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>Account Type</label>
                <div className="input-wrapper">
                  <Briefcase size={18} className="input-icon" />
                  <select name="role" value={formData.role} onChange={handleChange}>
                    <option value="user">Fitness Enthusiast (User)</option>
                    <option value="gym_owner">Gym Owner / Facility Manager</option>
                  </select>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary auth-submit-btn">
              {isLogin ? 'Log In' : 'Create Account'} <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button onClick={handleGuestLogin} className="btn btn-outline guest-btn">
            Continue as Guest
          </button>

          <div className="auth-toggle">
            {isLogin ? (
              <p>Don't have an account? <button type="button" onClick={() => setIsLogin(false)}>Sign Up</button></p>
            ) : (
              <p>Already have an account? <button type="button" onClick={() => setIsLogin(true)}>Log In</button></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;
