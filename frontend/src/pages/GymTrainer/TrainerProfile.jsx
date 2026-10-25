import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UserCheck, Building2, Users, Dumbbell, Award, FileText, Settings, 
  Camera, ArrowRight, Send, Image as ImageIcon, CheckCircle, Shield, 
  MapPin, Clock, Lock, Sparkles, RefreshCw, AlertCircle, X, ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import UserAvatar from '../../components/common/UserAvatar';
import ImageCropper from '../../components/layout/ImageCropper';
import PostList from '../../features/social/components/PostList';
import ProfileVerifyEmailModal from '../Profile/ProfileVerifyEmailModal';
import MedicalDisclaimer from '../../components/common/MedicalDisclaimer';
import './TrainerProfile.css';

const DEFAULT_SPECIALTIES = [
  'Strength & Conditioning',
  'Hypertrophy / Muscle Building',
  'Exercise Form & Biomechanics',
  'Fat Loss & Metabolic Conditioning',
  'Core & Mobility Training',
  'Functional Athletic Training'
];

const TrainerProfile = () => {
  const navigate = useNavigate();
  const trainerName = localStorage.getItem('gymsync_user_name') || 'Trainer';
  const userKey = trainerName.replace(/\s+/g, '_');
  const userRole = localStorage.getItem('gymsync_role') || 'GymTrainer';
  const token = localStorage.getItem('gymsync_token') || '';

  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [assignedGymName, setAssignedGymName] = useState('');
  const [assignedMembersCount, setAssignedMembersCount] = useState(0);
  const [assignedPlansCount, setAssignedPlansCount] = useState(0);
  const [profilePic, setProfilePic] = useState(localStorage.getItem(`gymsync_${userKey}_pic`) || '');
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const fileInputRef = useRef(null);

  // Posts State
  const [myPosts, setMyPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [selectedPostFile, setSelectedPostFile] = useState(null);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const postFileInputRef = useRef(null);

  // Credentials & Bio
  const [trainerBio, setTrainerBio] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState(['Strength & Conditioning', 'Exercise Form & Biomechanics']);
  const [yearsExperience, setYearsExperience] = useState('3+');
  const [isSavingBio, setIsSavingBio] = useState(false);

  // Settings State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Email Verification Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyEmailInput, setVerifyEmailInput] = useState('');
  const [otpStep, setOtpStep] = useState(1);
  const [otpInput, setOtpInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  });

  // Load Trainer Data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadAll = async () => {
      try {
        // 1. Fetch User Record
        const userRes = await fetch(`/api/users/${encodeURIComponent(trainerName)}`);
        let resolvedGym = 'PowerHouse Gym';
        if (userRes.ok) {
          const user = await userRes.json();
          if (isMounted) {
            setUserData(user);
            resolvedGym = user.assignedGymName || localStorage.getItem('gymsync_user_gym') || 'PowerHouse Gym';
            setAssignedGymName(resolvedGym);
            if (user.profilePic) {
              setProfilePic(user.profilePic);
              localStorage.setItem(`gymsync_${userKey}_pic`, user.profilePic);
            }
            if (user.bioData?.trainerBio) {
              setTrainerBio(user.bioData.trainerBio);
            }
            if (user.bioData?.specialties && Array.isArray(user.bioData.specialties)) {
              setSelectedSpecialties(user.bioData.specialties);
            }
          }
        }

        // 2. Fetch Members & Plans for this facility
        const [membersRes, plansRes, postsRes] = await Promise.all([
          fetch(`/api/users/gym-members/${encodeURIComponent(resolvedGym)}`).catch(() => null),
          fetch('/api/gym-owner/plans', { headers: getHeaders() }).catch(() => null),
          fetch('/api/posts').catch(() => null)
        ]);

        if (isMounted) {
          if (membersRes && membersRes.ok) {
            const membersData = await membersRes.json();
            if (Array.isArray(membersData)) setAssignedMembersCount(membersData.length);
          }

          if (plansRes && plansRes.ok) {
            const plansData = await plansRes.json();
            if (Array.isArray(plansData)) setAssignedPlansCount(plansData.length);
          }

          if (postsRes && postsRes.ok) {
            const postsData = await postsRes.json();
            if (Array.isArray(postsData)) {
              const myFiltered = postsData.filter(p => p && (p.authorName === trainerName || p.author?.name === trainerName));
              setMyPosts(myFiltered);
            }
          }
        }
      } catch (err) {
        console.warn('Error loading trainer profile details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAll();
    return () => { isMounted = false; };
  }, [trainerName, userKey]);

  // Profile Picture Upload
  const handlePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setRawImageSrc(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = async (croppedImage) => {
    setProfilePic(croppedImage);
    setRawImageSrc(null);
    localStorage.setItem(`gymsync_${userKey}_pic`, croppedImage);
    try {
      const res = await fetch('/api/users/profile-pic', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ profilePic: croppedImage })
      });
      if (res.ok) {
        toast.success('Professional profile picture updated.');
        window.dispatchEvent(new Event('gymsync_user_updated'));
      }
    } catch (e) {
      toast.error('Failed to save profile picture on server.');
    }
  };

  // Create Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim() && !selectedPostFile) {
      return toast.warn('Please enter some text or select an image/video to share.');
    }

    setIsPublishingPost(true);
    try {
      let mediaUrl = null;
      let mediaType = null;

      if (selectedPostFile) {
        const formData = new FormData();
        formData.append('media', selectedPostFile);
        const uploadRes = await fetch('/api/posts/upload-media', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          mediaUrl = uploadData.mediaUrl;
          mediaType = selectedPostFile.type.startsWith('video') ? 'video' : 'image';
        }
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          caption: newPostText.trim(),
          mediaUrl,
          mediaType
        })
      });

      if (res.ok) {
        const createdPost = await res.json();
        setMyPosts(prev => [createdPost, ...prev]);
        setNewPostText('');
        setSelectedPostFile(null);
        if (postFileInputRef.current) postFileInputRef.current.value = '';
        toast.success('Training update published to GymSync feed!');
      } else {
        toast.error('Failed to create post. Please try again.');
      }
    } catch (err) {
      toast.error('Network error creating post.');
    } finally {
      setIsPublishingPost(false);
    }
  };

  // Save Credentials / Bio
  const handleSaveBio = async () => {
    setIsSavingBio(true);
    try {
      const res = await fetch('/api/users/bio', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          trainerBio: trainerBio.trim(),
          specialties: selectedSpecialties,
          yearsExperience
        })
      });

      if (res.ok) {
        toast.success('Trainer credentials & bio saved successfully!');
      } else {
        toast.error('Failed to save credentials.');
      }
    } catch (e) {
      toast.error('Network error saving credentials.');
    } finally {
      setIsSavingBio(false);
    }
  };

  const toggleSpecialty = (spec) => {
    setSelectedSpecialties(prev => 
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return setPasswordError('Please fill in all password fields.');
    }
    if (newPassword !== confirmPassword) {
      return setPasswordError('New passwords do not match.');
    }
    if (newPassword.length < 6) {
      return setPasswordError('New password must be at least 6 characters long.');
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

      setPasswordMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Account password updated.');
    } catch (err) {
      setPasswordError(err.message || 'Unable to update password.');
      toast.error(err.message || 'Unable to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="trainer-profile-page">
      <div className="trainer-profile-container">

        {/* ── 1. PROFESSIONAL TRAINER HERO CARD ─────────────────────── */}
        <section className="trainer-hero-card">
          <div className="trainer-hero-top">
            <div className="trainer-hero-identity">
              <div className="trainer-avatar-wrapper">
                {profilePic ? (
                  <img src={profilePic} alt={trainerName} className="trainer-avatar-img" />
                ) : (
                  <UserAvatar src="" name={trainerName} size={92} />
                )}
                <button 
                  type="button" 
                  className="trainer-avatar-edit-btn" 
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload Trainer Photo"
                >
                  <Camera size={15} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handlePicUpload} 
                />
              </div>

              <div className="trainer-hero-details">
                <h1>
                  {trainerName}
                  <UserCheck size={24} color="#3b82f6" />
                </h1>
                <div className="trainer-badges-row">
                  <span className="trainer-badge role">
                    <Shield size={12} /> Certified Gym Trainer
                  </span>
                  <span className="trainer-badge gym">
                    <Building2 size={12} /> {assignedGymName || 'PowerHouse Gym'}
                  </span>
                  <span className="trainer-badge status">
                    ● On-Duty Staff
                  </span>
                </div>
              </div>
            </div>

            <div className="trainer-hero-actions">
              <Link to="/gym-trainer" className="trainer-action-btn primary">
                <Dumbbell size={16} /> Open Trainer Portal
              </Link>
              <button 
                type="button" 
                className="trainer-action-btn secondary"
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={16} /> Account
              </button>
            </div>
          </div>

          {/* 4 Professional Metric Highlights */}
          <div className="trainer-stats-strip">
            <div className="trainer-stat-box">
              <span className="trainer-stat-label">
                <Building2 size={13} color="#8b5cf6" /> Assigned Facility
              </span>
              <span className="trainer-stat-value" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {assignedGymName || 'PowerHouse Gym'}
              </span>
            </div>

            <div className="trainer-stat-box">
              <span className="trainer-stat-label">
                <Users size={13} color="#3b82f6" /> Assigned Members
              </span>
              <span className="trainer-stat-value">{assignedMembersCount}</span>
            </div>

            <div className="trainer-stat-box">
              <span className="trainer-stat-label">
                <Dumbbell size={13} color="#10b981" /> Active Routines
              </span>
              <span className="trainer-stat-value">{assignedPlansCount}</span>
            </div>

            <div className="trainer-stat-box">
              <span className="trainer-stat-label">
                <FileText size={13} color="#f59e0b" /> Published Posts
              </span>
              <span className="trainer-stat-value">{myPosts.length}</span>
            </div>
          </div>
        </section>

        {/* ── 2. DEDICATED TABS BAR ─────────────────────────────────── */}
        <div className="trainer-tabs-bar">
          <button 
            type="button" 
            className={`trainer-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <FileText size={16} /> Timeline & Posts ({myPosts.length})
          </button>
          <button 
            type="button" 
            className={`trainer-tab-btn ${activeTab === 'facility' ? 'active' : ''}`}
            onClick={() => setActiveTab('facility')}
          >
            <Building2 size={16} /> Assigned Facility
          </button>
          <button 
            type="button" 
            className={`trainer-tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
            onClick={() => setActiveTab('credentials')}
          >
            <Award size={16} /> Qualifications & Specialties
          </button>
          <button 
            type="button" 
            className={`trainer-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} /> Settings & Security
          </button>
        </div>

        {/* ── 3. TAB PANES ──────────────────────────────────────────── */}
        <div className="trainer-tab-pane">

          {/* TAB 1: Posts & Coaching Tips */}
          {activeTab === 'posts' && (
            <>
              {/* Post Composer */}
              <div className="trainer-post-composer">
                <form onSubmit={handleCreatePost}>
                  <div className="trainer-post-composer-top">
                    <UserAvatar src={profilePic} name={trainerName} size={42} />
                    <textarea 
                      className="trainer-post-textarea"
                      placeholder={`Share a workout tip, technique cue, or motivation with the community, Coach ${trainerName}...`}
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                    />
                  </div>

                  {selectedPostFile && (
                    <div className="trainer-post-file-preview">
                      <ImageIcon size={14} />
                      <span>{selectedPostFile.name} ({(selectedPostFile.size / 1024).toFixed(1)} KB)</span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedPostFile(null)} 
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div className="trainer-post-composer-bottom">
                    <button 
                      type="button" 
                      className="btn-outline"
                      style={{ padding: '8px 14px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => postFileInputRef.current?.click()}
                    >
                      <ImageIcon size={15} color="#3b82f6" /> Add Photo / Video
                    </button>
                    <input 
                      type="file" 
                      ref={postFileInputRef}
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      onChange={(e) => e.target.files?.[0] && setSelectedPostFile(e.target.files[0])}
                    />

                    <button 
                      type="submit" 
                      className="btn-primary"
                      disabled={isPublishingPost || (!newPostText.trim() && !selectedPostFile)}
                      style={{ padding: '8px 18px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Send size={14} /> {isPublishingPost ? 'Publishing...' : 'Share Post'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Feed of Trainer's Posts */}
              {myPosts.length > 0 ? (
                <PostList posts={myPosts} currentUserName={trainerName} />
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                  <FileText size={42} color="var(--text-secondary)" style={{ margin: '0 auto 12px auto' }} />
                  <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>No Posts Published Yet</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Share training insights, client transformations, or technique guides with your gym members above.
                  </p>
                </div>
              )}
            </>
          )}

          {/* TAB 2: Assigned Facility */}
          {activeTab === 'facility' && (
            <div className="trainer-facility-card">
              <div className="trainer-facility-header">
                <div>
                  <h3>
                    <Building2 size={24} color="#8b5cf6" />
                    {assignedGymName || 'PowerHouse Gym'}
                  </h3>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    Official Employment Facility &amp; Member Base
                  </span>
                </div>
                <Link to="/gym-trainer" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  Manage Assigned Members <ArrowRight size={15} />
                </Link>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.88rem', lineHeight: '1.5' }}>
                <strong style={{ color: '#60a5fa', display: 'block', marginBottom: '4px' }}>
                  Staff Assignment Note:
                </strong>
                You are registered as a certified trainer at <strong>{assignedGymName || 'PowerHouse Gym'}</strong>. 
                Members registered at this gym have direct access to your coaching programs and can receive workout schedules directly from your Trainer Portal.
              </div>

              <h4 style={{ margin: '14px 0 6px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Facility Features &amp; Equipment</h4>
              <div className="trainer-facility-grid">
                <div className="trainer-facility-feature">
                  <CheckCircle size={16} color="#10b981" />
                  <span>Free Weights &amp; Power Racks</span>
                </div>
                <div className="trainer-facility-feature">
                  <CheckCircle size={16} color="#10b981" />
                  <span>Selectorized Cable Machines</span>
                </div>
                <div className="trainer-facility-feature">
                  <CheckCircle size={16} color="#10b981" />
                  <span>Cardio &amp; Endurance Zone</span>
                </div>
                <div className="trainer-facility-feature">
                  <CheckCircle size={16} color="#10b981" />
                  <span>Functional Turf &amp; Sled Track</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Qualifications & Specialties */}
          {activeTab === 'credentials' && (
            <div className="trainer-credentials-card">
              <h3>
                <Award size={22} color="#3b82f6" />
                Trainer Credentials &amp; Coaching Specializations
              </h3>

              <div>
                <label className="trainer-form-label" style={{ display: 'block', marginBottom: '10px' }}>
                  Select Your Coaching Specializations (Displayed on your profile):
                </label>
                <div className="trainer-specialties-wrap">
                  {DEFAULT_SPECIALTIES.map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      className={`trainer-specialty-pill ${selectedSpecialties.includes(spec) ? 'active' : ''}`}
                      onClick={() => toggleSpecialty(spec)}
                    >
                      {selectedSpecialties.includes(spec) ? '✓ ' : '+ '} {spec}
                    </button>
                  ))}
                </div>
              </div>

              <div className="trainer-form-group">
                <label className="trainer-form-label">Coaching Philosophy &amp; Bio</label>
                <textarea 
                  className="trainer-form-input" 
                  rows={4}
                  placeholder="Describe your training methodology, client background, and coaching experience..."
                  value={trainerBio}
                  onChange={(e) => setTrainerBio(e.target.value)}
                />
              </div>

              <div className="trainer-form-group" style={{ maxWidth: '240px' }}>
                <label className="trainer-form-label">Years of Coaching Experience</label>
                <select 
                  className="trainer-form-input"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                >
                  <option value="1-2">1–2 Years</option>
                  <option value="3+">3–5 Years</option>
                  <option value="5+">5–10 Years</option>
                  <option value="10+">10+ Years (Senior Coach)</option>
                </select>
              </div>

              <button 
                type="button" 
                className="btn-primary"
                onClick={handleSaveBio}
                disabled={isSavingBio}
                style={{ alignSelf: 'flex-start', padding: '10px 22px' }}
              >
                {isSavingBio ? 'Saving...' : 'Save Credentials'}
              </button>
            </div>
          )}

          {/* TAB 4: Settings & Security */}
          {activeTab === 'settings' && (
            <div className="trainer-settings-card">
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} color="#3b82f6" />
                Security &amp; Account Settings
              </h3>

              {/* Password Change Form */}
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '420px' }}>
                <h4 style={{ margin: '8px 0 0 0', fontSize: '0.96rem', color: 'var(--text-primary)' }}>Change Password</h4>
                
                {passwordError && (
                  <div style={{ color: '#ef4444', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} /> {passwordError}
                  </div>
                )}
                {passwordMessage && (
                  <div style={{ color: '#10b981', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} /> {passwordMessage}
                  </div>
                )}

                <div className="trainer-form-group">
                  <label className="trainer-form-label">Current Password</label>
                  <input 
                    type="password" 
                    className="trainer-form-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="trainer-form-group">
                  <label className="trainer-form-label">New Password</label>
                  <input 
                    type="password" 
                    className="trainer-form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="trainer-form-group">
                  <label className="trainer-form-label">Confirm New Password</label>
                  <input 
                    type="password" 
                    className="trainer-form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isUpdatingPassword}
                  style={{ padding: '10px 18px', alignSelf: 'flex-start' }}
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>

              <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '14px 0' }} />

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', color: 'var(--text-primary)' }}>Email Verification</h4>
                <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
                  Registered Email: <strong>{userData?.email || 'trainer@gymsync.com'}</strong>
                </p>
                <button 
                  type="button" 
                  className="btn-outline"
                  onClick={() => setIsVerifyModalOpen(true)}
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  Verify or Update Gmail
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Medical / Fitness Footer Disclaimer */}
        <MedicalDisclaimer variant="footer" />

      </div>

      {/* Image Cropper Modal */}
      {rawImageSrc && (
        <ImageCropper 
          imageSrc={rawImageSrc} 
          onCropComplete={onCropComplete} 
          onCancel={() => setRawImageSrc(null)} 
        />
      )}

      {/* Email Verification Modal */}
      {isVerifyModalOpen && (
        <ProfileVerifyEmailModal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          otpStep={otpStep}
          setOtpStep={setOtpStep}
          verifyEmailInput={verifyEmailInput}
          setVerifyEmailInput={setVerifyEmailInput}
          otpInput={otpInput}
          setOtpInput={setOtpInput}
          isSendingOtp={isSendingOtp}
          isVerifyingOtp={isVerifyingOtp}
          handleSendEmailOtp={async (e) => {
            e.preventDefault();
            setIsSendingOtp(true);
            try {
              const res = await fetch('/api/auth/send-verification-otp', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ email: verifyEmailInput })
              });
              if (res.ok) {
                setOtpStep(2);
                toast.success('Verification OTP code sent to ' + verifyEmailInput);
              } else {
                toast.error('Failed to send OTP code.');
              }
            } catch (err) {
              toast.error('Network error sending OTP.');
            } finally {
              setIsSendingOtp(false);
            }
          }}
          handleVerifyEmailOtp={async (e) => {
            e.preventDefault();
            setIsVerifyingOtp(true);
            try {
              const res = await fetch('/api/auth/verify-email-otp', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ email: verifyEmailInput, otp: otpInput })
              });
              if (res.ok) {
                toast.success('Email successfully authenticated & verified!');
                setIsVerifyModalOpen(false);
              } else {
                toast.error('Invalid or expired OTP code.');
              }
            } catch (err) {
              toast.error('Network error verifying OTP.');
            } finally {
              setIsVerifyingOtp(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default TrainerProfile;
