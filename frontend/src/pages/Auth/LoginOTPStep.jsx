import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import './AuthPortal.css'; // Reuse existing styles

export default function LoginOTPStep({ email, tempToken, onVerify, onCancel }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        body: JSON.stringify({ email, otp, tempToken })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'OTP verification failed');
      
      onVerify(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          We've sent a 6-digit security code to <strong>{email}</strong>.
        </p>
        
        {error && <div className="auth-error">{error}</div>}
        
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
        
        <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={onCancel}>
          Back to Login
        </button>
      </form>
    </div>
  );
}
