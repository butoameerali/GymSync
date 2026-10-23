import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ProfileSettingsPanel from '../Profile/ProfileSettingsPanel';
import ProfileVerifyEmailModal from '../Profile/ProfileVerifyEmailModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import { ArrowLeft, Settings, Shield } from 'lucide-react';
import '../Profile/Profile.css';

const SettingsPage = () => {
  const { section } = useParams();
  const navigate = useNavigate();

  // Normalize URL section parameter: general, security (or password), privacy, delete (or deactivate)
  const mapSection = (sec) => {
    if (!sec) return 'general';
    const s = sec.toLowerCase();
    if (s === 'password' || s === 'security') return 'security';
    if (s === 'privacy' || s === 'gdpr') return 'privacy';
    if (s === 'delete' || s === 'deactivate') return 'delete';
    return 'general';
  };

  const [activeSection, setActiveSection] = useState(() => mapSection(section));
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const userName = localStorage.getItem('gymsync_user_name') || 'Member';
  const userRole = localStorage.getItem('gymsync_role') || 'User';
  const authToken = localStorage.getItem('gymsync_token') || '';

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Privacy state
  const [hideHealthData, setHideHealthData] = useState(() => localStorage.getItem('gymsync_privacy_hideHealth') === 'true');

  // Deactivate & Delete Account modals
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeactivateAccountModal, setShowDeactivateAccountModal] = useState(false);
  const [isDeactivatingAccount, setIsDeactivatingAccount] = useState(false);

  // Email Verification & OTP modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyEmailInput, setVerifyEmailInput] = useState('');
  const [otpStep, setOtpStep] = useState(1);
  const [otpInput, setOtpInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Keep activeSection in sync with route param
  useEffect(() => {
    if (section) {
      setActiveSection(mapSection(section));
    }
  }, [section]);

  const handleTabChange = (newTab) => {
    setActiveSection(newTab);
    navigate(`/settings/${newTab}`);
  };

  // Fetch current user settings & profile
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/${userName}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
          if (data.email) setVerifyEmailInput(data.email);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };
    if (userName && authToken) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [userName, authToken]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
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
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password update failed');
      setPasswordMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully!');
    } catch (err) {
      setPasswordError(err.message || 'Unable to update password.');
      toast.error(err.message || 'Unable to update password.');
    }
  };

  const handleDeactivateAccount = async () => {
    setIsDeactivatingAccount(true);
    try {
      const response = await fetch('/api/users/deactivate', {
        method: 'PUT',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to deactivate account.');
      ['userInfo', 'gymsync_token', 'gymsync_role', 'gymsync_user_name'].forEach(k => localStorage.removeItem(k));
      setShowDeactivateAccountModal(false);
      toast.info('Your account has been deactivated. You can reactivate anytime simply by logging back in.');
      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate account');
    } finally {
      setIsDeactivatingAccount(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const response = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to delete account.');
      ['userInfo', 'gymsync_token', 'gymsync_role', 'gymsync_user_name'].forEach(k => localStorage.removeItem(k));
      setShowDeleteAccountModal(false);
      toast.warning('Your account has been moved to the Recycle Bin. You have 15 days to log in and restore it.');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err) {
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    if (!verifyEmailInput.trim()) return;
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/users/send-verification-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ userName, email: verifyEmailInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      toast.success(data.message || '6-digit OTP sent to your Gmail address.');
      setOtpStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    setIsVerifyingOtp(true);
    try {
      const res = await fetch('/api/users/verify-email-otp', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ userName, email: verifyEmailInput.trim(), otp: otpInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP Verification failed');
      setUserData(prev => ({
        ...(prev || {}),
        email: verifyEmailInput.trim(),
        isEmailVerified: true,
        isGoogleApproved: true
      }));
      toast.success('✅ Email authenticated & updated successfully!');
      setIsVerifyModalOpen(false);
      setOtpStep(1);
      setOtpInput('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="large" message="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '30px 16px 80px', maxWidth: '1000px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="btn btn-outline btn-sm"
            style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={22} color="var(--primary-accent)" /> Settings &amp; Privacy
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Manage your personal credentials, security, location, and account lifecycle
            </span>
          </div>
        </div>

        <Link to="/profile" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
          View Profile
        </Link>
      </div>

      {/* Main Settings Panel */}
      <ProfileSettingsPanel
        activeSettingSection={activeSection}
        setActiveSettingSection={handleTabChange}
        userName={userName}
        userRole={userRole}
        userData={userData}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        passwordMessage={passwordMessage}
        passwordError={passwordError}
        handleChangePassword={handleChangePassword}
        hideHealthData={hideHealthData}
        setHideHealthData={setHideHealthData}
        bio={userData?.bioData || {}}
        stats={{}}
        history={[]}
        myPosts={[]}
        profilePic=""
        setShowDeleteAccountModal={setShowDeleteAccountModal}
        setShowDeactivateAccountModal={setShowDeactivateAccountModal}
        setVerifyEmailInput={setVerifyEmailInput}
        setIsVerifyModalOpen={setIsVerifyModalOpen}
        onProfileUpdate={(updatedUser) => setUserData(updatedUser)}
        toast={toast}
      />

      {/* Email Verification & 2MFA Modal */}
      <ProfileVerifyEmailModal
        isOpen={isVerifyModalOpen}
        onClose={() => {
          setIsVerifyModalOpen(false);
          setOtpStep(1);
          setOtpInput('');
        }}
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

      {/* Deactivate Account Modal */}
      <ConfirmDialog
        isOpen={showDeactivateAccountModal}
        onClose={() => setShowDeactivateAccountModal(false)}
        onConfirm={handleDeactivateAccount}
        title="Deactivate Account"
        message="Are you sure you want to temporarily deactivate your account? Your profile and posts will be hidden, and you can reactivate anytime simply by logging back in."
        confirmText={isDeactivatingAccount ? 'Deactivating...' : 'Deactivate Account'}
        type="warning"
      />

      {/* Delete Account 15-Day Grace Period Modal */}
      <ConfirmDialog
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
        title="Move Account to Recycle Bin (15 Days)"
        message="Your account will be scheduled for permanent deletion in 15 days. During this grace period, you can log in at any time to instantly restore your account and cancel deletion. Proceed?"
        confirmText={isDeletingAccount ? 'Moving to Recycle Bin...' : 'Confirm Account Deletion'}
        type="danger"
      />
    </div>
  );
};

export default SettingsPage;
