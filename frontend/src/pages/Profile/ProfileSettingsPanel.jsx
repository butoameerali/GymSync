import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Shield, 
  Trash2, 
  DownloadCloud, 
  UserX, 
  Clock, 
  Edit3, 
  Save, 
  Compass, 
  MapPin, 
  Target, 
  FileText, 
  CheckCircle, 
  AlertOctagon, 
  Mail, 
  Key,
  X,
  ShieldCheck,
  Smartphone,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { can } from '../../config/permissions';

const FITNESS_GOALS = [
  'Muscle Hypertrophy & Strength',
  'Weight Loss & Fat Burn',
  'Athletic Performance & Speed',
  'Endurance & Cardiovascular Health',
  'Functional Fitness & Mobility',
  'General Fitness & Wellness'
];

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
  setShowDeactivateAccountModal,
  setVerifyEmailInput,
  setIsVerifyModalOpen,
  onProfileUpdate,
  toast,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formName, setFormName] = useState(userName || '');
  const [formCity, setFormCity] = useState(userData?.city || '');
  const [formCountry, setFormCountry] = useState(userData?.country || '');
  const [formGoal, setFormGoal] = useState(userData?.fitnessGoal || bio?.fitnessGoals || '');
  const [formBio, setFormBio] = useState(userData?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showNameSudoModal, setShowNameSudoModal] = useState(false);
  const [sudoPassword, setSudoPassword] = useState('');

  // 2FA & Session Security States
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(userData?.twoFactorEnabled || false);
  const [togglingTwoFactor, setTogglingTwoFactor] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const isAdminRole = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(userRole);
  const isTrainee = userRole === 'User' || userRole === 'Guest';

  useEffect(() => {
    if (userData?.twoFactorEnabled !== undefined) {
      setTwoFactorEnabled(userData.twoFactorEnabled);
    }
  }, [userData]);

  useEffect(() => {
    if (activeSettingSection === 'security') {
      fetchSessions();
    }
  }, [activeSettingSection]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleToggleTwoFactor = async () => {
    const privilegedRoles = ['Admin', 'SuperAdmin', 'ComplaintModerator', 'FitnessInstructor'];
    if (privilegedRoles.includes(userRole) && twoFactorEnabled) {
      toast.warning('Two-factor authentication is strictly enforced for privileged staff.');
      return;
    }

    setTogglingTwoFactor(true);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch('/api/auth/two-factor', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ enabled: !twoFactorEnabled })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update 2FA setting');

      setTwoFactorEnabled(data.twoFactorEnabled);
      toast.success(data.message || `Two-factor authentication ${data.twoFactorEnabled ? 'enabled' : 'disabled'}.`);
      if (onProfileUpdate) {
        onProfileUpdate({ ...userData, twoFactorEnabled: data.twoFactorEnabled });
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTogglingTwoFactor(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setRevokingSessionId(sessionId);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to revoke session');

      toast.success('Session revoked successfully.');
      setSessions(prev => prev.filter(s => s._id !== sessionId));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    setRevokingOthers(true);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch('/api/auth/sessions/revoke-others', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to revoke other sessions');

      toast.success(data.message || 'All other active sessions have been revoked.');
      fetchSessions();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRevokingOthers(false);
    }
  };

  useEffect(() => {
    if (userName) setFormName(userName);
    if (userData) {
      if (userData.city !== undefined) setFormCity(userData.city || '');
      if (userData.country !== undefined) setFormCountry(userData.country || '');
      if (userData.fitnessGoal !== undefined) setFormGoal(userData.fitnessGoal || '');
      if (userData.bio !== undefined) setFormBio(userData.bio || '');
    }
  }, [userName, userData]);

  const fallbackIpDetect = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.city) setFormCity(data.city);
        if (data.country_name) setFormCountry(data.country_name);
        toast.success(`Location detected: ${[data.city, data.country_name].filter(Boolean).join(', ')}`);
      } else {
        toast.error('Could not auto-detect location. Please enter manually.');
      }
    } catch (err) {
      toast.error('Could not auto-detect location. Please enter manually.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const detectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude, longitude } = pos.coords;
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              if (res.ok) {
                const data = await res.json();
                const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
                const country = data.address?.country || '';
                if (city) setFormCity(city);
                if (country) setFormCountry(country);
                toast.success(`Location detected: ${[city, country].filter(Boolean).join(', ')}`);
                setIsDetectingLocation(false);
                return;
              }
            } catch (e) {
              // fallback
            }
            fallbackIpDetect();
          },
          () => {
            fallbackIpDetect();
          },
          { timeout: 7000 }
        );
      } else {
        fallbackIpDetect();
      }
    } catch (e) {
      fallbackIpDetect();
    }
  };

  const executeSaveProfile = async (passwordForSudo = '') => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const bodyPayload = {
        name: formName.trim(),
        city: formCity.trim(),
        country: formCountry.trim(),
        fitnessGoal: formGoal.trim(),
        bio: formBio.trim()
      };
      if (passwordForSudo) {
        bodyPayload.sudoPassword = passwordForSudo;
      }

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile settings');

      toast.success('Account profile updated successfully!');
      setIsEditingProfile(false);
      setShowNameSudoModal(false);
      setSudoPassword('');

      if (onProfileUpdate && data.user) {
        onProfileUpdate(data.user);
      } else if (data.user?.name && data.user.name !== userName) {
        localStorage.setItem('gymsync_user_name', data.user.name);
        window.dispatchEvent(new Event('gymsync_user_updated'));
      }
    } catch (err) {
      toast.error(err.message || 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!formName.trim()) {
      toast.error('Full Name cannot be empty.');
      return;
    }

    // If member is changing their name, require password verification for 2MFA
    if (formName.trim() !== userName) {
      setShowNameSudoModal(true);
      return;
    }

    await executeSaveProfile('');
  };

  const handleConfirmNameChange = async (e) => {
    e.preventDefault();
    if (!sudoPassword.trim()) {
      toast.error('Password is required to verify name change.');
      return;
    }
    await executeSaveProfile(sudoPassword.trim());
  };

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
          <UserX size={18} /> Deactivate or Delete
        </button>
      </div>

      {/* Right Settings Content Card */}
      <div className="glass-panel fb-settings-card">
        {activeSettingSection === 'general' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 className="section-title" style={{ margin: 0 }}><User size={20} /> General Account Settings</h3>
              {!isEditingProfile ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsEditingProfile(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit3 size={15} /> Edit Profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setFormName(userName);
                      setFormCity(userData?.city || '');
                      setFormCountry(userData?.country || '');
                      setFormGoal(userData?.fitnessGoal || '');
                      setFormBio(userData?.bio || '');
                      setIsEditingProfile(false);
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '16px' }}>
                <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Full Name / Member Handle * (Requires password verification to change)
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="input-field"
                    placeholder="Your Full Name"
                    required
                  />
                </div>

                {/* Location with Auto-Detect */}
                <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Location (City &amp; Country)
                    </label>
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={isDetectingLocation}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Compass size={13} /> {isDetectingLocation ? 'Detecting...' : 'Auto-Detect Location'}
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="input-field"
                      placeholder="City (e.g. London)"
                    />
                    <input
                      type="text"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      className="input-field"
                      placeholder="Country (e.g. United Kingdom)"
                    />
                  </div>
                </div>

                {/* Trainee-Only Fitness Goals & Bio (Applicable strictly for Trainees) */}
                {isTrainee && (
                  <>
                    <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Primary Fitness Goal
                      </label>
                      <select
                        value={formGoal}
                        onChange={(e) => setFormGoal(e.target.value)}
                        className="input-field"
                        style={{ background: 'var(--input-bg, #1e293b)', color: '#fff' }}
                      >
                        <option value="">-- Select Goal --</option>
                        {FITNESS_GOALS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        About / Bio Summary
                      </label>
                      <textarea
                        value={formBio}
                        onChange={(e) => setFormBio(e.target.value)}
                        className="input-field"
                        rows={3}
                        placeholder="Tell other athletes about your fitness journey, achievements, or favorite lifts..."
                      />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsEditingProfile(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSaving}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Save size={16} /> {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gap: '14px' }}>
                {/* Full Name Card */}
                <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full Name</div>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '4px', color: '#fff' }}>{userName}</div>
                </div>

                {/* Google Gmail Address Card with Edit / 2MFA Verify */}
                <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Google Gmail Address</div>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '4px', color: '#fff' }}>{userData?.email || 'Not connected'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {userData?.isGoogleApproved || userData?.isEmailVerified ? (
                      <span style={{ color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                        ✅ Verified
                      </span>
                    ) : null}
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setVerifyEmailInput(userData?.email || '');
                        setIsVerifyModalOpen(true);
                      }}
                      style={{ fontSize: '0.82rem' }}
                    >
                      {userData?.isEmailVerified ? 'Change Email (OTP)' : 'Verify Now (OTP)'}
                    </button>
                  </div>
                </div>

                {/* Location Card with Auto-Detect */}
                <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Location</div>
                    <div style={{ fontWeight: 600, fontSize: '1.02rem', marginTop: '4px', color: '#fff' }}>
                      {formCity || formCountry ? `${formCity}${formCity && formCountry ? ', ' : ''}${formCountry}` : (userData?.location || 'Not configured')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isDetectingLocation}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    title="Auto-detect current city and country"
                  >
                    <Compass size={14} /> {isDetectingLocation ? 'Detecting...' : 'Auto-Detect Location'}
                  </button>
                </div>

                {/* Trainee-Only Info: Goals and Bio (Applicable strictly for Trainees) */}
                {isTrainee && (
                  <>
                    <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Primary Fitness Goal</div>
                      <div style={{ fontWeight: 600, fontSize: '1.02rem', marginTop: '4px', color: formGoal ? '#10b981' : 'var(--text-secondary)' }}>
                        {formGoal || 'General Fitness'}
                      </div>
                    </div>

                    {formBio && (
                      <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Bio / Summary</div>
                        <div style={{ fontWeight: 400, fontSize: '0.95rem', marginTop: '4px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                          {formBio}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Sudo Password Confirmation Modal for Name Change */}
            {showNameSudoModal && (
              <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNameSudoModal(false)}>
                <div 
                  className="modal-content glass-panel" 
                  style={{ maxWidth: '420px', width: '90%', borderRadius: '16px', padding: '24px', background: 'var(--card-bg, #111827)' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Key size={20} color="var(--primary-accent)" />
                      <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>2MFA Password Verification</h3>
                    </div>
                    <button onClick={() => setShowNameSudoModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleConfirmNameChange} style={{ display: 'grid', gap: '14px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                      Changing your account username from <strong>{userName}</strong> to <strong>{formName}</strong> requires password verification for security.
                    </p>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                        Current Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={sudoPassword}
                        onChange={e => setSudoPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="input-field"
                        autoFocus
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <button type="button" className="btn btn-outline" onClick={() => setShowNameSudoModal(false)} style={{ flex: 1 }}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ flex: 2 }}>
                        {isSaving ? 'Verifying...' : 'Confirm & Update Name'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSettingSection === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* TWO-FACTOR AUTHENTICATION (2FA) */}
            <div style={{
              background: 'var(--card-bg)',
              padding: '24px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: twoFactorEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: twoFactorEnabled ? '#10b981' : '#94a3b8'
                  }}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 600 }}>Two-Factor Authentication (2FA)</h4>
                      <span style={{
                        background: twoFactorEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                        color: twoFactorEnabled ? '#10b981' : '#94a3b8',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {twoFactorEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '500px', lineHeight: '1.5' }}>
                      Require a 6-digit cryptographic security code sent to your authenticated email upon every new sign-in attempt.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleTwoFactor}
                  disabled={togglingTwoFactor}
                  className={twoFactorEnabled ? 'btn btn-outline' : 'btn btn-primary'}
                  style={{ minWidth: '130px' }}
                >
                  {togglingTwoFactor ? 'Updating...' : (twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA')}
                </button>
              </div>
            </div>

            {/* CHANGE PASSWORD */}
            <div style={{
              background: 'var(--card-bg)',
              padding: '24px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <h3 className="section-title" style={{ marginBottom: '16px', fontSize: '1.1rem' }}>
                <Lock size={18} /> Change Account Password
              </h3>
              <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '16px', maxWidth: '500px' }}>
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
                {passwordError && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem' }}>{passwordError}</p>}
                {passwordMessage && <p style={{ color: '#10b981', margin: 0, fontSize: '0.85rem' }}>{passwordMessage}</p>}
                <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
                  Update Password
                </button>
              </form>
            </div>

            {/* RECOGNIZED SESSIONS & ACTIVE DEVICES */}
            <div style={{
              background: 'var(--card-bg)',
              padding: '24px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 className="section-title" style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Smartphone size={18} color="var(--primary-accent)" /> Recognized Devices &amp; Active Sessions
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    Manage sessions that have accessed your account. Revoke suspicious or lost devices immediately.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={fetchSessions}
                    disabled={loadingSessions}
                    className="btn btn-outline btn-sm"
                    title="Refresh Session List"
                  >
                    <RefreshCw size={14} className={loadingSessions ? 'spin' : ''} />
                  </button>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={handleRevokeAllOtherSessions}
                      disabled={revokingOthers}
                      className="btn btn-outline btn-sm"
                      style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    >
                      <LogOut size={14} /> {revokingOthers ? 'Revoking...' : 'Revoke All Other Devices'}
                    </button>
                  )}
                </div>
              </div>

              {loadingSessions ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading active sessions...</p>
              ) : sessions.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No recognized sessions found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {sessions.map(s => (
                    <div
                      key={s._id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        background: s.isCurrent ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: s.isCurrent ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Smartphone size={20} color={s.isCurrent ? '#3b82f6' : '#94a3b8'} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                              {s.deviceInfo || 'Web Browser'}
                            </span>
                            {s.isCurrent && (
                              <span style={{
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#3b82f6',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 600
                              }}>
                                This Device
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            IP: {s.ip || '127.0.0.1'} • Last active: {new Date(s.lastActive).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {!s.isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(s._id)}
                          disabled={revokingSessionId === s._id}
                          className="btn btn-outline btn-sm"
                          style={{
                            fontSize: '0.78rem',
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            padding: '4px 10px'
                          }}
                        >
                          {revokingSessionId === s._id ? 'Revoking...' : 'Revoke Access'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Temporary Deactivation Option */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '24px', borderRadius: '12px' }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-accent)' }}>
                <UserX size={20} /> Deactivate Account (Temporary)
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                Temporarily pause your account. Your profile and posts will be hidden from other members. Your workout history and account data remain completely intact. You can reactivate anytime simply by logging back in.
              </p>
              <button
                type="button"
                className="btn btn-outline"
                style={{ marginTop: '16px', borderColor: 'var(--primary-accent)', color: 'var(--primary-accent)' }}
                onClick={() => setShowDeactivateAccountModal(true)}
              >
                Deactivate Account
              </button>
            </div>

            {/* Soft Delete with 15-Day Recycle Bin Grace Period */}
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '24px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', margin: 0 }}>
                  <Trash2 size={20} /> Delete Account (15-Day Grace Period)
                </h3>
                <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} /> 15-Day Recovery Window
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginTop: '12px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                When you initiate deletion, your account enters a protected <strong>15-day Recycle Bin grace period</strong>.
                Your profile will be unlisted immediately, but all your records, stats, and workouts are safely held in case you wish to return.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px 14px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#60a5fa' }}>
                  <Mail size={16} /> <strong>Instant Security Alert:</strong> An email will be dispatched to your registered address with a 1-click cancel link.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#a3e635' }}>
                  <CheckCircle size={16} /> <strong>Zero-Hassle Restore:</strong> Simply log back in anytime within 15 days to cancel deletion instantly.
                </div>
              </div>
              <button
                type="button"
                className="btn"
                style={{ background: '#ef4444', color: '#fff', marginTop: '18px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setShowDeleteAccountModal(true)}
              >
                <Trash2 size={16} /> Schedule Account Deletion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettingsPanel;
