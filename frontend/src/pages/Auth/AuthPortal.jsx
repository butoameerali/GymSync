import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, Briefcase, ArrowRight, Sun, Moon, Eye, EyeOff, RotateCcw, Clock } from 'lucide-react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useTheme } from '../../context/ThemeContext';
import { getRoleRedirectPath } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import LoginOTPStep from './LoginOTPStep';
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
  const [resetToken, setResetToken] = useState('');
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
      toast.success(res.message || 'If this account exists, an OTP has been sent.');
      setStep(STEP.OTP);
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await post('/api/auth/verify-otp', { email, otp });
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
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
      await post('/api/auth/reset-password', { email, newPassword, resetToken });
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
const getPasswordStrength = (pass = '') => {
  if (!pass) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 3) return { score: 2, label: 'Fair', color: '#f59e0b' };
  return { score: 3, label: 'Strong', color: '#10b981' };
};

const AuthPortal = () => {
  const { theme, toggleTheme } = useTheme();
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const [isLogin, setIsLogin] = useState(initialPath !== '/register');
  const [showForgot, setShowForgot] = useState(initialPath === '/forgot-password');
  const [showPass, setShowPass] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'user' });
  const [googleData, setGoogleData] = useState(null);

  // 2FA State
  const [needs2FA, setNeeds2FA] = useState(false);
  const [twoFaData, setTwoFaData] = useState({ email: '', tempToken: '' });

  // Recycle Bin / Self-Restore State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreData, setRestoreData] = useState({ email: '', daysRemaining: 15, password: '' });
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem('gymsync_token');
  const role = localStorage.getItem('gymsync_role');
  const isLoggedIn = Boolean(token && role && role !== 'guest');
  const [isAuthenticating, setIsAuthenticating] = useState(isLoggedIn);
  const navigate = useNavigate();

  const getDestinationPath = (userRole) => {
    try {
      const params = new URLSearchParams(window.location.search);
      const redirectParam = params.get('redirect');
      if (redirectParam && redirectParam.startsWith('/')) {
        return redirectParam;
      }
      if (location.state?.from?.pathname) {
        return location.state.from.pathname + (location.state.from.search || '');
      }
    } catch (e) {
      // ignore
    }
    return getRoleRedirectPath(userRole);
  };

  useEffect(() => {
    if (isLoggedIn) {
      navigate(getDestinationPath(role), { replace: true });
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
    window.location.href = getDestinationPath(data.role);
  };

  const handleRestoreAccount = async () => {
    setIsRestoring(true);
    setRestoreError('');
    try {
      const res = await fetch('/api/auth/restore-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: restoreData.email,
          password: restoreData.password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to restore account');
      toast.success(data.message || 'Account restored successfully!');
      setShowRestoreModal(false);
      storeAndRedirect(data);
    } catch (err) {
      setRestoreError(err.message || 'Failed to restore account');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin && !googleData) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
    }

    setIsSubmitting(true);
    const endpoint = googleData ? '/api/auth/google/register' : (isLogin ? '/api/auth/login' : '/api/auth/register');
    try {
      let backendRole = 'User';
      if (formData.role === 'gym_owner') backendRole = 'GymOwner';
      const payload = googleData
        ? { email: googleData.email, displayName: formData.name, role: formData.role, picture: googleData.picture }
        : isLogin
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, password: formData.password, role: backendRole };
      if (payload.name) payload.name = payload.name.trim();

      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');
      
      if (data.requiresOtp) {
        setTwoFaData({ email: data.email, tempToken: data.tempToken });
        setNeeds2FA(true);
        return;
      }

      if (data.requiresRestore) {
        setRestoreData({
          email: data.email || formData.email,
          daysRemaining: data.daysRemaining,
          password: formData.password
        });
        setRestoreError('');
        setShowRestoreModal(true);
        return;
      }
      
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
          {needs2FA ? (
            <LoginOTPStep 
              email={twoFaData.email} 
              tempToken={twoFaData.tempToken} 
              onVerify={storeAndRedirect} 
              onCancel={() => setNeeds2FA(false)} 
            />
          ) : (
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
                {!isLogin && formData.password && (() => {
                  const strength = getPasswordStrength(formData.password);
                  return (
                    <div style={{ marginTop: '6px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${(strength.score / 3) * 100}%`,
                          height: '100%',
                          background: strength.color,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                    </div>
                  );
                })()}
              </div>}

              {!isLogin && !googleData && (
                <div className="form-group">
                  <label>Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      name="confirmPassword" required placeholder="Re-enter password"
                      value={formData.confirmPassword} onChange={handleChange}
                    />
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p style={{ color: '#ef4444', fontSize: '0.78rem', margin: '4px 0 0 0' }}>Passwords do not match</p>
                  )}
                </div>
              )}

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
          )}
        </div>

        {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

        {showRestoreModal && (
          <div className="forgot-overlay" onClick={(e) => e.target === e.currentTarget && setShowRestoreModal(false)}>
            <div className="forgot-modal glass-panel" style={{ maxWidth: '460px' }}>
              <div className="forgot-header">
                <RotateCcw size={28} color="#10b981" />
                <h3>Restore Your Account</h3>
                <button className="forgot-close" onClick={() => setShowRestoreModal(false)}>✕</button>
              </div>

              <div style={{ padding: '8px 0' }}>
                <div style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}>
                  <Clock size={24} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.95rem' }}>Recycle Bin Grace Period</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                      Your account (<strong>{restoreData.email}</strong>) is currently scheduled for permanent deletion.
                      You have <strong>{restoreData.daysRemaining} day{restoreData.daysRemaining > 1 ? 's' : ''}</strong> left to restore it.
                    </div>
                  </div>
                </div>

                <p style={{ color: 'var(--text-primary)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '16px' }}>
                  Restoring your account will cancel the scheduled deletion and reactivate all your workouts, posts, bio, and membership privileges immediately.
                </p>

                {!restoreData.password && (
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>Confirm Password to Restore</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" />
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={restoreData.password}
                        onChange={(e) => setRestoreData({ ...restoreData, password: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {restoreError && <p className="forgot-error" style={{ marginBottom: '12px' }}>{restoreError}</p>}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={isRestoring}
                    onClick={() => setShowRestoreModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: '#10b981', borderColor: '#10b981' }}
                    disabled={isRestoring || !restoreData.password}
                    onClick={handleRestoreAccount}
                  >
                    {isRestoring ? 'Restoring...' : 'Restore & Log In'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
};

export default AuthPortal;
