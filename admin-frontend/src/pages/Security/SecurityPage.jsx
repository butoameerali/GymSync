import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ShieldCheck, ShieldAlert, Key, Lock, CheckCircle2, AlertTriangle, RefreshCw, User, Mail, Shield } from 'lucide-react';
import { toast } from 'react-toastify';

const SecurityPage = () => {
  const { user, role, authHeaders } = useAdminAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading2FA, setLoading2FA] = useState(true);
  const [toggling2FA, setToggling2FA] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Fetch current user details including 2FA state from authoritative endpoint
  const fetchSecurityDetails = async () => {
    try {
      setLoading2FA(true);
      const res = await fetch('/api/auth/me', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTwoFactorEnabled(Boolean(data.twoFactorEnabled));
      }
    } catch (err) {
      console.error('Failed to load security details:', err);
    } finally {
      setLoading2FA(false);
    }
  };

  useEffect(() => {
    fetchSecurityDetails();
  }, []);

  const handleToggle2FA = async () => {
    const privilegedRoles = ['Admin', 'SuperAdmin'];
    if (privilegedRoles.includes(role) && twoFactorEnabled) {
      toast.warning('2-Step Verification is mandatory for Senior Administrative staff and cannot be turned off.');
      return;
    }

    try {
      setToggling2FA(true);
      const nextState = !twoFactorEnabled;
      const res = await fetch('/api/auth/two-factor', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ enabled: nextState })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update 2-step verification');

      setTwoFactorEnabled(data.twoFactorEnabled);
      toast.success(
        data.twoFactorEnabled
          ? '✅ 2-Step Verification turned ON! A 6-digit code will now be required on login.'
          : '⚠️ 2-Step Verification turned OFF.'
      );
    } catch (err) {
      toast.error(err.message || 'Network error updating 2FA');
    } finally {
      setToggling2FA(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.warning('Please enter current and new passwords.');
    }
    if (newPassword !== confirmPassword) {
      return toast.warning('New password and confirm password do not match.');
    }
    if (newPassword.length < 6) {
      return toast.warning('New password must be at least 6 characters.');
    }

    try {
      setUpdatingPassword(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password update failed');

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Could not change password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={28} color="#3b82f6" />
          Security &amp; 2-Step Verification
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '4px' }}>
          Protect your staff credentials with Two-Factor OTP authentication and manage account security.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* 1. 2-Step Verification Card */}
        <div style={{
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: twoFactorEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: twoFactorEnabled ? '#10b981' : '#ef4444'
                }}>
                  {twoFactorEnabled ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f9fafb', margin: 0 }}>
                    2-Step Verification (2FA)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Email OTP on Login</span>
                </div>
              </div>

              <span style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: twoFactorEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: twoFactorEnabled ? '#34d399' : '#f87171',
                border: `1px solid ${twoFactorEnabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
              }}>
                {loading2FA ? 'Checking...' : (twoFactorEnabled ? 'ENABLED' : 'DISABLED')}
              </span>
            </div>

            <div style={{
              background: '#1f2937',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid #374151'
            }}>
              <p style={{ fontSize: '0.88rem', color: '#d1d5db', lineHeight: 1.5, margin: 0 }}>
                {twoFactorEnabled ? (
                  <>
                    <strong style={{ color: '#10b981' }}>Your account is secured.</strong> Every time you sign in with your email and password, GymSync will send a secure 6-digit OTP code to <strong style={{ color: '#60a5fa' }}>{user?.email}</strong>.
                  </>
                ) : (
                  <>
                    <strong style={{ color: '#f59e0b' }}>2-Step Verification is currently inactive.</strong> Turn it on now so that even if someone gets your password, they cannot access your instructor portal without your email OTP code.
                  </>
                )}
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={handleToggle2FA}
              disabled={toggling2FA || loading2FA}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: (toggling2FA || loading2FA) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                border: 'none',
                background: twoFactorEnabled
                  ? '#374151'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff'
              }}
            >
              {toggling2FA ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  Updating Security...
                </>
              ) : twoFactorEnabled ? (
                <>
                  <ShieldAlert size={16} />
                  Turn OFF 2-Step Verification
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Turn ON 2-Step Verification (Recommended)
                </>
              )}
            </button>
            {['Admin', 'SuperAdmin'].includes(role) && twoFactorEnabled && (
              <p style={{ fontSize: '0.74rem', color: '#9ca3af', textAlign: 'center', marginTop: '8px' }}>
                * Mandatory security policy enforced for Senior Admins
              </p>
            )}
          </div>
        </div>

        {/* 2. Staff Profile & Credentials */}
        <div style={{
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f9fafb', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="#3b82f6" />
            Active Staff Profile
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#1f2937', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Full Name:</span>
              <strong style={{ fontSize: '0.85rem', color: '#f3f4f6' }}>{user?.name || 'Staff User'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#1f2937', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Authorized Email:</span>
              <strong style={{ fontSize: '0.85rem', color: '#60a5fa' }}>{user?.email}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#1f2937', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Clearance Role:</span>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#93c5fd',
                background: 'rgba(59, 130, 246, 0.2)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                {role || 'FitnessInstructor'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#1f2937', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Session Status:</span>
              <span style={{ fontSize: '0.85rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> Active Secure Token
              </span>
            </div>
          </div>
        </div>

        {/* 3. Change Password Card */}
        <div style={{
          gridColumn: '1 / -1',
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f9fafb', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={18} color="#eab308" />
            Update Password
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '18px' }}>
            Choose a strong passphrase with at least 6 characters including numbers and symbols.
          </p>

          <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px' }}>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px' }}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px' }}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#1f2937',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={updatingPassword}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: 'none',
                  background: '#3b82f6',
                  color: '#fff',
                  cursor: updatingPassword ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default SecurityPage;
