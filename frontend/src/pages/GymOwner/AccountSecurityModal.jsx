import React, { useState } from 'react';
import { X, ShieldCheck, Lock, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import ProfileVerifyEmailModal from '../Profile/ProfileVerifyEmailModal';

const AccountSecurityModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Email verification modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [otpStep, setOtpStep] = useState(1);
  const [verifyEmailInput, setVerifyEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  if (!isOpen) return null;

  const token = localStorage.getItem('gymsync_token') || '';
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password update failed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Security password updated successfully.');
      onClose();
    } catch (err) {
      setPasswordError(err.message || 'Unable to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!verifyEmailInput || !verifyEmailInput.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/auth/send-verification-otp', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email: verifyEmailInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to send OTP');
      toast.success('Security verification code sent to your email.');
      setOtpStep(2);
    } catch (err) {
      toast.error(err.message || 'Failed to send verification code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!otpInput || otpInput.trim().length < 4) {
      toast.error('Please enter the verification code');
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email: verifyEmailInput, otp: otpInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid code');
      toast.success('Email successfully verified!');
      setIsVerifyModalOpen(false);
      setOtpStep(1);
    } catch (err) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div 
        className="glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-secondary, #151821)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          color: 'var(--text-primary)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-accent)'
            }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Account &amp; Security</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Manage login credentials and email verification
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} color="var(--primary-accent)" /> Change Password
            </h4>

            {passwordError && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                fontSize: '0.85rem',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} /> {passwordError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--card-bg, rgba(255,255,255,0.05))',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--card-bg, rgba(255,255,255,0.05))',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--card-bg, rgba(255,255,255,0.05))',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline btn-sm"
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 18px' }}
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>

        {/* Email Verification Action */}
        <div style={{
          marginTop: '24px',
          paddingTop: '18px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Email Verification
            </strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Verify owner email for secure notifications &amp; recovery
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsVerifyModalOpen(true)}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Mail size={14} /> Verify Email
          </button>
        </div>

        {/* Nested ProfileVerifyEmailModal */}
        <ProfileVerifyEmailModal
          isOpen={isVerifyModalOpen}
          onClose={() => { setIsVerifyModalOpen(false); setOtpStep(1); setOtpInput(''); }}
          otpStep={otpStep}
          setOtpStep={setOtpStep}
          verifyEmailInput={verifyEmailInput}
          setVerifyEmailInput={setVerifyEmailInput}
          otpInput={otpInput}
          setOtpInput={setOtpInput}
          isSendingOtp={isSendingOtp}
          isVerifyingOtp={isVerifyingOtp}
          handleSendEmailOtp={handleSendEmailOtp}
          handleVerifyEmailOtp={handleVerifyEmailOtp}
        />
      </div>
    </div>
  );
};

export default AccountSecurityModal;
