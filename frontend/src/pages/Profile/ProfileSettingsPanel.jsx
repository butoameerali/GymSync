import React from 'react';
import { User, Lock, Shield, Trash2, DownloadCloud } from 'lucide-react';
import { can } from '../../config/permissions';

const ProfileSettingsPanel = ({
  activeSettingSection,
  setActiveSettingSection,
  userName,
  userRole,
  userData,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordMessage,
  passwordError,
  handleChangePassword,
  hideHealthData,
  setHideHealthData,
  bio,
  stats,
  history,
  myPosts,
  profilePic,
  setShowDeleteAccountModal,
  setVerifyEmailInput,
  setIsVerifyModalOpen,
  toast,
}) => {
  return (
    <div className="fb-settings-container">
      {/* Left Settings Nav */}
      <div className="glass-panel fb-settings-nav">
        <button
          className={`fb-settings-nav-btn ${activeSettingSection === 'general' ? 'active' : ''}`}
          onClick={() => setActiveSettingSection('general')}
        >
          <User size={18} /> General Account
        </button>
        <button
          className={`fb-settings-nav-btn ${activeSettingSection === 'security' ? 'active' : ''}`}
          onClick={() => setActiveSettingSection('security')}
        >
          <Lock size={18} /> Security &amp; Password
        </button>
        <button
          className={`fb-settings-nav-btn ${activeSettingSection === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveSettingSection('privacy')}
        >
          <Shield size={18} /> Privacy &amp; GDPR
        </button>
        <button
          className={`fb-settings-nav-btn ${activeSettingSection === 'delete' ? 'active' : ''}`}
          onClick={() => setActiveSettingSection('delete')}
        >
          <Trash2 size={18} /> Delete Account
        </button>
      </div>

      {/* Right Settings Content Card */}
      <div className="glass-panel fb-settings-card">
        {activeSettingSection === 'general' && (
          <div>
            <h3 className="section-title" style={{ marginBottom: '16px' }}><User size={20} /> General Account Settings</h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full Name</div>
                <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '4px' }}>{userName}</div>
              </div>
              <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Account Role</div>
                <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '4px' }}>{userRole}</div>
              </div>
              <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Google Gmail Address</div>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '4px' }}>{userData?.email || 'Not connected'}</div>
                </div>
                {userData?.isGoogleApproved || userData?.isEmailVerified ? (
                  <span style={{ color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                    ✅ Verified
                  </span>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setVerifyEmailInput(userData?.email || '');
                      setIsVerifyModalOpen(true);
                    }}
                  >
                    Verify Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSettingSection === 'security' && (
          <div>
            <h3 className="section-title" style={{ marginBottom: '16px' }}><Lock size={20} /> Change Password</h3>
            <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '16px' }}>
              <label>
                Current Password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="input-field"
                />
              </label>
              <label>
                New Password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="input-field"
                />
              </label>
              <label>
                Confirm New Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="input-field"
                />
              </label>
              {passwordError && <p style={{ color: '#ef4444', margin: 0 }}>{passwordError}</p>}
              {passwordMessage && <p style={{ color: '#10b981', margin: 0 }}>{passwordMessage}</p>}
              <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
                Save New Password
              </button>
            </form>
          </div>
        )}

        {activeSettingSection === 'privacy' && (
          <div>
            <h3 className="section-title" style={{ marginBottom: '16px' }}><Shield size={20} color="var(--primary-accent)" /> Privacy &amp; GDPR Controls</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Manage what others can view and export your stored data.</p>

            {can(userRole, 'profile', 'health_bio_privacy') && (
              <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Lock size={16}/> Private Health Bio</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Hide your Height and Weight from your public profile.</p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={hideHealthData}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setHideHealthData(isChecked);
                        localStorage.setItem('gymsync_privacy_hideHealth', isChecked ? 'true' : 'false');
                        toast.success(`Health data is now ${isChecked ? 'PRIVATE' : 'PUBLIC'} on your profile.`);
                      }}
                      style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                    />
                  </label>
                </div>
              </div>
            )}

            <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><DownloadCloud size={16}/> Download My Personal Data</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Export a JSON archive of your bio, workouts, and posts (GDPR compliant).</p>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const data = { bio, stats, history, myPosts, profilePic: !!profilePic };
                    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `GymSync_Data_${userName}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSettingSection === 'delete' && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '24px', borderRadius: '12px' }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}><Trash2 size={20} /> Permanent Account Deletion</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.6' }}>
              Permanently delete your account, posts, workout history, and personal profile from GymSync. Once confirmed, this action cannot be recovered.
            </p>
            <button
              className="btn"
              style={{ background: '#ef4444', color: '#fff', marginTop: '16px' }}
              onClick={() => setShowDeleteAccountModal(true)}
            >
              Delete Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettingsPanel;
