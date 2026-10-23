import React, { useState, useEffect } from 'react';
import { Mail, ShieldAlert, RotateCw } from 'lucide-react';
import { toast } from 'react-toastify';
import './AuthPortal.css'; // Reuse existing styles

export default function LoginOTPStep({ email, tempToken, onVerify, onCancel }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [currentTempToken, setCurrentTempToken] = useState(tempToken);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, tempToken: currentTempToken })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429) {
          setOtp('');
        }
        throw new Error(data.message || 'OTP verification failed');
      }
      
      toast.success('Two-factor authentication successful!');
      onVerify(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/resend-login-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tempToken: currentTempToken })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to resend security code');
      }
      toast.success(data.message || 'New OTP sent to your email!');
      if (data.tempToken) {
        setCurrentTempToken(data.tempToken);
      }
      setResendCooldown(60);
      setOtp('');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="brand-logo">
          <span className="brand-icon">⚡</span>
          <h2>GymSync Security</h2>
        </div>
        <p className="auth-subtitle">Two-Factor Authentication Required</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
          We've sent a 6-digit security code to <strong>{email}</strong>.<br />
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Valid for 5 minutes (Max 3 attempts)</span>
        </p>
        
        {error && (
          <div className="auth-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        
        <div className="form-group">
          <label>Security Code (OTP)</label>
          <div className="input-wrapper">
            <Mail size={18} className="input-icon" />
            <input 
              type="text" 
              maxLength={6}
              required 
              placeholder="000000" 
              value={otp} 
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '1.2rem', paddingLeft: '1rem' }}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify Login'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            style={{
              background: 'none',
              border: 'none',
              color: resendCooldown > 0 ? 'var(--text-secondary, #64748b)' : 'var(--primary-accent, #3b82f6)',
              cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCw size={14} className={resending ? 'spin' : ''} />
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Security Code'}
          </button>
        </div>
        
        <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.75rem' }} onClick={onCancel}>
          Back to Login
        </button>
      </form>
    </div>
  );
}
