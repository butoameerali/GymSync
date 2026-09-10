import React from 'react';
import Modal from '../../components/common/Modal';

const ProfileVerifyEmailModal = ({
  isOpen,
  onClose,
  otpStep,
  setOtpStep,
  verifyEmailInput,
  setVerifyEmailInput,
  otpInput,
  setOtpInput,
  isSendingOtp,
  isVerifyingOtp,
  handleSendEmailOtp,
  handleVerifyEmailOtp,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Authenticate & Verify Gmail">
      {otpStep === 1 ? (
        <form onSubmit={handleSendEmailOtp} style={{ display: 'grid', gap: '16px', padding: '10px 0' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
            Step 1: Enter your Google Gmail address. We will send a 6-digit OTP code to authenticate your account.
          </p>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>Google Gmail Address</label>
            <input
              type="email"
              required
              className="search-input"
              style={{ width: '100%', padding: '12px' }}
              placeholder="name@gmail.com"
              value={verifyEmailInput}
              onChange={e => setVerifyEmailInput(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', background: '#3b82f6', borderColor: '#3b82f6', marginTop: '10px' }}
            disabled={isSendingOtp}
          >
            {isSendingOtp ? 'Sending OTP Code...' : 'Send 6-Digit OTP Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyEmailOtp} style={{ display: 'grid', gap: '16px', padding: '10px 0' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
            Step 2: Enter the 6-digit OTP code sent to <strong style={{ color: 'var(--primary-accent)' }}>{verifyEmailInput}</strong> to confirm authentication.
          </p>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>6-Digit OTP Code</label>
            <input
              type="text"
              required
              maxLength={6}
              className="search-input"
              style={{ width: '100%', padding: '12px', letterSpacing: '6px', textAlign: 'center', fontSize: '1.4rem', fontWeight: 'bold' }}
              placeholder="123456"
              value={otpInput}
              onChange={e => setOtpInput(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={() => setOtpStep(1)}>
              Back
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, padding: '12px', background: '#10b981', borderColor: '#10b981' }}
              disabled={isVerifyingOtp}
            >
              {isVerifyingOtp ? 'Authenticating...' : 'Authenticate & Approve'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ProfileVerifyEmailModal;
