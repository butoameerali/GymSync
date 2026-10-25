import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, RotateCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import './AuthPortal.css';

export default function SignupOTPStep({ email, onVerify, onCancel }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [isLockedOut, setIsLockedOut] = useState(false);

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
      setError('Please enter a valid 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setIsLockedOut(true);
          setAttemptsRemaining(0);
          setOtp('');
          throw new Error(data.message || 'Maximum verification attempts exceeded. Please request a new security code.');
        }
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
        }
        throw new Error(data.message || 'OTP verification failed. Please try again.');
      }

      toast.success('Email verified successfully! Your account is activated.');
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
      const res = await fetch('/api/auth/resend-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to resend verification code');
      }
      toast.success(data.message || 'A fresh 6-digit OTP has been sent to your email.');
      setResendCooldown(60);
      setAttemptsRemaining(3);
      setIsLockedOut(false);
      setOtp('');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-card glass-panel" style={{ maxWidth: '440px', width: '100%', margin: '0 auto' }}>
      <div className="auth-header">
        <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', marginBottom: '12px' }}>
          <ShieldCheck size={36} color="var(--primary-accent, #3b82f6)" />
        </div>
        <h2>Verify Your Email</h2>
        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem', marginTop: '6px' }}>
          We have dispatched a 6-digit activation code to:
        </p>
        <p style={{ fontWeight: 600, color: '#fff', fontSize: '1rem', marginTop: '2px' }}>
          {email}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '20px' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '18px',
          fontSize: '0.82rem',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span>
            Code expires in 10 minutes. For security, <strong>maximum 3 attempts</strong> are allowed before invalidation.
          </span>
        </div>

        {error && (
          <div className="auth-error-banner" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span>6-Digit Security Code</span>
            {!isLockedOut && attemptsRemaining < 3 && (
              <span style={{ color: attemptsRemaining === 1 ? '#ef4444' : '#f59e0b', fontSize: '0.78rem' }}>
                {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} left
              </span>
            )}
          </label>
          <div className="input-wrapper">
            <Mail size={18} className="input-icon" />
            <input
              type="text"
              required
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={loading || isLockedOut}
              autoFocus
              style={{ letterSpacing: '4px', fontSize: '1.2rem', textAlign: 'center', fontWeight: 'bold' }}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary auth-submit-btn"
          disabled={loading || otp.length !== 6 || isLockedOut}
          style={{ width: '100%', marginTop: '8px' }}
        >
          {loading ? 'Verifying Code...' : (
            <>
              Confirm &amp; Activate Account <ArrowRight size={18} />
            </>
          )}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.85rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer', padding: 0 }}
          >
            ← Back to sign up
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            style={{
              background: 'none',
              border: 'none',
              color: resendCooldown > 0 ? '#64748b' : 'var(--primary-accent, #3b82f6)',
              cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500
            }}
          >
            <RotateCw size={14} className={resending ? 'spin' : ''} />
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
          </button>
        </div>
      </form>
    </div>
  );
}
