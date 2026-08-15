import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, Briefcase, ArrowRight, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useTheme } from '../../context/ThemeContext';
import { getRoleRedirectPath } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import './AuthPortal.css';

// ------------------------------------------------------------------
// IMPORTANT: Add your Google Client ID to frontend/.env as
//   VITE_GOOGLE_CLIENT_ID=your_client_id_here
// ------------------------------------------------------------------
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Forgot-password flow steps
const STEP = { EMAIL: 'email', OTP: 'otp', RESET: 'reset', DONE: 'done' };

const ForgotPasswordModal = ({ onClose }) => {
  const [step, setStep] = useState(STEP.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const post = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await post('/api/auth/forgot-password', { email });
      toast.success('OTP sent! Please check your email inbox.');
      setStep(STEP.OTP);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await post('/api/auth/verify-otp', { email, otp });
      setStep(STEP.RESET);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await post('/api/auth/reset-password', { email, newPassword });
      setStep(STEP.DONE);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  return (
    <div className="forgot-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="forgot-modal glass-panel">
        <div className="forgot-header">
          <Activity size={28} color="var(--primary-accent)" />
          <h3>
            {step === STEP.EMAIL && 'Forgot Password'}
            {step === STEP.OTP && 'Enter OTP'}
            {step === STEP.RESET && 'Set New Password'}
            {step === STEP.DONE && 'Password Reset!'}
          </h3>
          <button className="forgot-close" onClick={onClose}>✕</button>
        </div>

        {step === STEP.DONE ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Your password has been reset successfully.</p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Back to Login</button>
          </div>
        ) : (
          <>
            {step === STEP.EMAIL && (
              <form onSubmit={handleSendOTP}>
                <p className="forgot-desc">Enter the email address linked to your GymSync account. We'll send a 6-digit OTP.</p>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input type="email" required placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
                {error && <p className="forgot-error">{error}</p>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {step === STEP.OTP && (
              <form onSubmit={handleVerifyOTP}>
                <p className="forgot-desc">A 6-digit OTP was sent to <strong>{email}</strong>. It expires in 10 minutes.</p>
                <div className="form-group">
                  <label>One-Time Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type="text" required placeholder="123456" maxLength={6}
                      value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      style={{ letterSpacing: '8px', fontSize: '1.4rem', textAlign: 'center' }}
                    />
                  </div>
                </div>
                {error && <p className="forgot-error">{error}</p>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button type="button" className="forgot-resend" onClick={() => handleSendOTP({ preventDefault: () => {} })}>
                  Resend OTP
                </button>
              </form>
            )}

            {step === STEP.RESET && (
              <form onSubmit={handleResetPassword}>
                <p className="forgot-desc">OTP verified! Now choose a strong new password.</p>
                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input type={showPass ? 'text' : 'password'} required placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <button type="button" className="pass-toggle" onClick={() => setShowPass(p => !p)}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input type={showPass ? 'text' : 'password'} required placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
                {error && <p className="forgot-error">{error}</p>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>
                  {loading ? 'Saving...' : 'Reset Password'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Main Auth Portal
// ──────────────────────────────────────────────
const AuthPortal = () => {
  const { theme, toggleTheme } = useTheme();
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const [isLogin, setIsLogin] = useState(initialPath !== '/register');
  const [showForgot, setShowForgot] = useState(initialPath === '/forgot-password');
  const [showPass, setShowPass] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user' });
  const [googleData, setGoogleData] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('gymsync_token');
  const role = localStorage.getItem('gymsync_role');
  const isLoggedIn = Boolean(token && role && role !== 'guest');
  const [isAuthenticating, setIsAuthenticating] = useState(isLoggedIn);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      navigate(getRoleRedirectPath(role), { replace: true });
    } else {
      setIsAuthenticating(false);
    }
  }, [isLoggedIn, role, navigate]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const storeAndRedirect = (data) => {
    localStorage.setItem('gymsync_token', data.token);
    localStorage.setItem('gymsync_role', data.role);
    localStorage.setItem('gymsync_user_name', data.name);
    localStorage.setItem('userInfo', JSON.stringify(data));
    // Guest history migration
    const guestHistory = localStorage.getItem('gymsync_Guest_User_history');
    if (guestHistory) {
      const userKey = data.name.replace(/\s+/g, '_');
      const existing = JSON.parse(localStorage.getItem(`gymsync_${userKey}_history`) || '[]');
      localStorage.setItem(`gymsync_${userKey}_history`, JSON.stringify([...existing, ...JSON.parse(guestHistory)]));
      localStorage.removeItem('gymsync_Guest_User_history');
    }
    window.location.href = getRoleRedirectPath(data.role);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(''); setIsSubmitting(true);
    const endpoint = googleData ? '/api/auth/google/register' : (isLogin ? '/api/auth/login' : '/api/auth/register');
    try {
      let backendRole = 'User';
      if (formData.role === 'gym_owner') backendRole = 'GymOwner';
      const payload = googleData
        ? { email: googleData.email, displayName: formData.name, role: formData.role, picture: googleData.picture }
        : isLogin
        ? { email: formData.email, password: formData.password }
        : { ...formData, role: backendRole };
      if (payload.name) payload.name = payload.name.trim();

      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');
      if (data.needsRegistration) {
        setGoogleData(data.googleData);
        setFormData(current => ({
          ...current,
          name: data.googleData.suggestedName || current.name,
          email: data.googleData.email || current.email,
          password: ''
        }));
        setIsLogin(false);
        toast.info('Choose an account type to complete your Google registration.');
        return;
      }
      storeAndRedirect(data);
    } catch (err) {
      setError(err.message.includes('Failed to fetch')
        ? 'Unable to reach the server. Please start the backend and try again.'
        : err.message);
    } finally { setIsSubmitting(false); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Google login failed');
      if (data.needsRegistration) {
        setGoogleData(data.googleData);
        setFormData(current => ({
          ...current,
          name: data.googleData.suggestedName || current.name,
          email: data.googleData.email || current.email,
          password: ''
        }));
        setIsLogin(false);
        toast.info('Choose an account type to complete your Google registration.');
        return;
      }
      toast.success('Signed in with Google!');
      storeAndRedirect(data);
    } catch (err) {
      toast.error(err.message.includes('Failed to fetch') || err.message.includes('NetworkError')
        ? 'Could not connect to the server. Please start the backend and try again.'
        : err.message || 'Google sign-in failed. Please try again.');
    }
  };

  const handleGuestLogin = () => {
    localStorage.removeItem('userInfo');
    localStorage.setItem('gymsync_role', 'guest');
    localStorage.setItem('gymsync_user_name', 'Guest User');
    localStorage.removeItem('gymsync_token');
    window.location.href = '/home';
  };

  if (isAuthenticating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-color)' }}>
        <LoadingSpinner size="large" message="Verifying GymSync session & loading dashboard..." />
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="auth-portal">
        {/* Theme toggle — top right */}
        <button
          className="auth-theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="auth-container">
          {/* Left Side: Brand */}
          <div className="auth-brand">
            <div className="brand-header">
              <Activity className="brand-logo" size={48} />
              <h1 className="brand-title">GymSync</h1>
            </div>
            <p className="brand-subtitle">
              Connect with gyms, track your workouts, leverage AI training, and join a passionate fitness community.
            </p>
            <div className="brand-features">
              <div className="feature-item"><div className="feature-dot"></div><span>AI-Powered Exercise Form &amp; Rep Counter</span></div>
              <div className="feature-item"><div className="feature-dot"></div><span>Explore Top Local Gyms &amp; Membership Plans</span></div>
              <div className="feature-item"><div className="feature-dot"></div><span>Social Fitness Community &amp; Progress Tracking</span></div>
            </div>
          </div>

          {/* Right Side: Auth Card */}
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
                    <input type="text" name="name" required placeholder="John Doe" value={formData.name} onChange={handleChange} />
                  </div>
                </div>
              )}

              {!googleData && <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input type="email" name="email" required placeholder="name@example.com" value={formData.email} onChange={handleChange} />
                </div>
              </div>}

              {!googleData && <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Password</label>
                  {isLogin && (
                    <button type="button" className="forgot-link" onClick={() => setShowForgot(true)}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password" required placeholder="••••••••"
                    value={formData.password} onChange={handleChange}
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(p => !p)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>}

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

              {googleData && (
                <p className="forgot-desc" style={{ margin: 0 }}>
                  Completing Google registration for <strong>{googleData.email}</strong>.
                </p>
              )}

              <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : (<>{isLogin ? 'Log In' : 'Create Account'} <ArrowRight size={18} /></>)}
              </button>
            </form>

            <div className="auth-divider"><span>OR</span></div>

            {/* Google Sign-In */}
            <div className="google-btn-wrapper">
              {GOOGLE_CLIENT_ID ? (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google sign-in failed. Try again.')}
                  theme={theme === 'dark' ? 'filled_black' : 'outline'}
                  size="large"
                  width="100%"
                  text={isLogin ? 'signin_with' : 'signup_with'}
                />
              ) : (
                <div className="google-config-note">
                  Add <code>VITE_GOOGLE_CLIENT_ID</code> to <code>frontend/.env</code> to enable Google Sign-In.
                </div>
              )}
            </div>

            <div className="auth-divider"><span>OR</span></div>

            <button onClick={handleGuestLogin} className="btn btn-outline guest-btn">
              Continue as Guest
            </button>

            <div className="auth-toggle">
              {isLogin ? (
                <p>Don't have an account? <button type="button" onClick={() => { setGoogleData(null); setIsLogin(false); }}>Sign Up</button></p>
              ) : (
                <p>Already have an account? <button type="button" onClick={() => { setGoogleData(null); setIsLogin(true); }}>Log In</button></p>
              )}
            </div>
          </div>
        </div>

        {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
      </div>
    </GoogleOAuthProvider>
  );
};

export default AuthPortal;
