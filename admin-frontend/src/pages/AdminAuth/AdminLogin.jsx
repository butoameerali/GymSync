import React, { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Shield, Lock, Mail, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';

const AdminLogin = () => {
  const { login, verifyOtp } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.requiresOtp) {
        setRequiresOtp(true);
        setTempToken(result.tempToken);
        toast.info('Enter the 2FA verification code sent to your email.');
      } else {
        toast.success('Authenticated to Administrative Portal');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOtp(email, otp, tempToken);
      toast.success('2FA verification successful');
    } catch (err) {
      setError(err.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1e293b 0%, #0b0f19 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: '#111827',
        border: '1px solid #374151',
        borderRadius: '16px',
        padding: '36px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Header Badge */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Shield size={28} color="#60a5fa" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', margin: '0 0 6px 0' }}>
            GymSync Ops Portal
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
            Restricted Administrative Access Only
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            color: '#f87171',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {!requiresOtp ? (
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db', marginBottom: '6px' }}>
                Operational Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6b7280' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gymsync.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#d1d5db', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6b7280' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-admin btn-admin-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem' }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Admin Portal'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '16px' }}>
                Two-Factor Security is enforced for administrative staff. Enter the 6-digit code sent to <strong>{email}</strong>.
              </p>
              <div style={{ position: 'relative' }}>
                <KeyRound size={20} style={{ position: 'absolute', left: '14px', top: '14px', color: '#6b7280' }} />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 42px',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#10b981',
                    fontSize: '1.4rem',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    outline: 'none',
                    fontFamily: 'monospace',
                    fontWeight: 700
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-admin btn-admin-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem' }}
            >
              {loading ? 'Verifying Code...' : 'Verify 2FA Code'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1f2937', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0 }}>
            Looking for public membership or gym owner portal? Visit{' '}
            <a href="http://localhost:5173" style={{ color: '#60a5fa', textDecoration: 'none' }}>GymSync Public Website</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
