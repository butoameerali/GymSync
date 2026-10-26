import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, ShieldCheck, ShieldAlert, Users, Building2, ShoppingBag, 
  Settings, Camera, ExternalLink, Send, Image as ImageIcon, CheckCircle2, 
  Clock, RefreshCw, AlertCircle, Award, Lock, FileText
} from 'lucide-react';
import { toast } from 'react-toastify';
import UserAvatar from '../../components/common/UserAvatar';
import ImageCropper from '../../components/layout/ImageCropper';
import PostList from '../../features/social/components/PostList';
import ProfileVerifyEmailModal from './ProfileVerifyEmailModal';
import { postService } from '../../services/postService';
import './AdminProfile.css';

const AdminProfile = () => {
  const adminName = localStorage.getItem('gymsync_user_name') || 'Administrator';
  const userRole = localStorage.getItem('gymsync_role') || 'Admin';
  const userKey = adminName.replace(/\s+/g, '_');
  const token = localStorage.getItem('gymsync_token') || '';

  const isModerator = userRole === 'ComplaintModerator';
  const [activeTab, setActiveTab] = useState('operations');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  // Profile Picture & Cropper
  const [profilePic, setProfilePic] = useState(localStorage.getItem(`gymsync_${userKey}_pic`) || '');
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const fileInputRef = useRef(null);

  // Announcements State
  const [myPosts, setMyPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [selectedPostFile, setSelectedPostFile] = useState(null);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const postFileInputRef = useRef(null);

  // Security / Password State
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

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await fetch(`/api/users/${encodeURIComponent(adminName)}`);
      if (userRes.ok) {
        const u = await userRes.json();
        setUserData(u);
        if (u.profilePic) {
          setProfilePic(u.profilePic);
          localStorage.setItem(`gymsync_${userKey}_pic`, u.profilePic);
        }
        setVerifyEmailInput(u.email || '');
      }

      const postsRes = await fetch('/api/posts');
      if (postsRes.ok) {
        const pData = await postsRes.json();
        if (Array.isArray(pData)) {
          setMyPosts(pData.filter(p => p && (p.authorName === adminName || p.author?.name === adminName)));
        }
      }
    } catch (err) {
      console.warn('Error loading admin profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [adminName]);

  const handlePicUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setRawImageSrc(reader.result);
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = null;
  };

  const onCropComplete = async (croppedImage) => {
    setProfilePic(croppedImage);
    setRawImageSrc(null);
    try {
      localStorage.setItem(`gymsync_${userKey}_pic`, croppedImage);
      const res = await fetch('/api/users/profile-pic', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ profilePic: croppedImage })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update photo');
      toast.success('Administrative profile photo updated.');
    } catch (err) {
      toast.error(err.message || 'Error updating photo');
    }
  };

  const handleCreatePost = async (e) => {
    if (e) e.preventDefault();
    if (!newPostText.trim() && !selectedPostFile) {
      toast.warning('Please enter announcement text.');
      return;
    }
    setIsPublishingPost(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostText);
      formData.append('authorName', adminName);
      if (selectedPostFile) formData.append('media', selectedPostFile);
      const created = await postService.createPost(formData);
      setMyPosts(prev => [created, ...prev]);
      setNewPostText('');
      setSelectedPostFile(null);
      if (postFileInputRef.current) postFileInputRef.current.value = null;
      toast.success('System broadcast published!');
    } catch (err) {
      toast.error(err.message || 'Failed to publish post');
    } finally {
      setIsPublishingPost(false);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      const updated = await postService.likePost(postId);
      setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p)));
    } catch (err) {
      toast.error(err.message || 'Failed to like post');
    }
  };

  const handleAddComment = async (postId, text) => {
    try {
      const updated = await postService.addComment(postId, text);
      setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p)));
    } catch (err) {
      toast.error(err.message || 'Failed to add comment');
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const updated = await postService.deleteComment(postId, commentId);
      setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p)));
    } catch (err) {
      toast.error(err.message || 'Failed to delete comment');
    }
  };

  const handleAddReply = async (postId, commentId, text) => {
    try {
      const updated = await postService.addReply(postId, commentId, text);
      setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p)));
    } catch (err) {
      toast.error(err.message || 'Failed to reply');
    }
  };

  const handleDeleteReply = async (postId, commentId, replyId) => {
    try {
      const updated = await postService.deleteReply(postId, commentId, replyId);
      setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p)));
    } catch (err) {
      toast.error(err.message || 'Failed to delete reply');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
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
      setPasswordMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Administrative password updated.');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    if (!verifyEmailInput.trim()) return;
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/users/send-verification-otp', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userName: adminName, email: verifyEmailInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      toast.success('6-digit OTP sent to administrative email.');
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
        headers: getHeaders(),
        body: JSON.stringify({ userName: adminName, email: verifyEmailInput.trim(), otp: otpInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP Verification failed');
      setUserData(prev => ({ ...(prev || {}), email: verifyEmailInput.trim(), isEmailVerified: true }));
      toast.success('Administrative email verified!');
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
      <div className="admin-profile-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={40} color="var(--primary-accent)" />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading Administrative Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-profile-page">
      <div className="admin-profile-container">

        {/* ─── Hero Card ─────────────────────────────────────────────────── */}
        <section className="admin-hero-card">
          <div className="admin-hero-top">
            <div className="admin-hero-identity">
              <div className="admin-avatar-wrapper">
                {profilePic ? (
                  <img src={profilePic} alt={adminName} className="admin-avatar-img" />
                ) : (
                  <UserAvatar src="" name={adminName} size={96} />
                )}
                <button
                  type="button"
                  className="admin-avatar-edit-btn"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  title="Upload Photo"
                  aria-label="Upload Photo"
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

              <div className="admin-hero-details">
                <div className="admin-badges-row">
                  <span className="admin-badge role">
                    {isModerator ? <ShieldAlert size={13} /> : <Shield size={13} />}
                    {isModerator ? 'Complaint Moderator' : 'Platform Administrator'}
                  </span>
                  <span className="admin-badge verified">
                    <ShieldCheck size={13} /> System Security Lead
                  </span>
                </div>

                <h1>{adminName}</h1>
                <p className="admin-org-name">GymSync Executive Operations &amp; Moderation</p>

                <div className="admin-contact-chips">
                  {userData?.email && (
                    <span className="contact-chip">
                      {userData.email}
                      {userData.isEmailVerified && <CheckCircle2 size={12} color="#10b981" title="Verified" />}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Launch Admin Portal (Port 5174) — Only shown to actual authorized admins */}
            <div className="admin-hero-actions">
              <a
                href="http://localhost:5174/login"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary admin-panel-cta"
              >
                <Shield size={18} />
                <span>Launch Admin Portal (Port 5174)</span>
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="stat-icon-box blue">
                <Shield size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">Active</div>
                <div className="stat-lbl">System Security Status</div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon-box green">
                <CheckCircle2 size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">Level 5</div>
                <div className="stat-lbl">Operational Clearance</div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon-box purple">
                <Lock size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">2FA Active</div>
                <div className="stat-lbl">Identity Protection</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Tabs ──────────────────────────────────────────────────────── */}
        <div className="admin-tabs-bar">
          <button
            className={`admin-tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
            onClick={() => setActiveTab('operations')}
          >
            <Shield size={17} />
            <span>Operational Tools</span>
          </button>

          <button
            className={`admin-tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            <Send size={17} />
            <span>Platform Broadcasts</span>
            <span className="tab-pill">{myPosts.length}</span>
          </button>

          <button
            className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={17} />
            <span>Account &amp; Security</span>
          </button>
        </div>

        {/* ─── Tab 1: Operational Tools ──────────────────────────────────── */}
        {activeTab === 'operations' && (
          <div className="admin-tab-content">
            <div className="admin-section-header">
              <div>
                <h2>Administrative Modules</h2>
                <p>Access high-privilege operational management desks hosted on Port 5174.</p>
              </div>
            </div>

            <div className="admin-modules-grid">
              <a href="http://localhost:5174/login" target="_blank" rel="noopener noreferrer" className="admin-module-card">
                <div className="module-icon-box blue">
                  <Users size={24} />
                </div>
                <h3>User &amp; Role Management</h3>
                <p>Review all registered platform accounts, assign roles, and handle access privileges.</p>
                <span className="module-launch-link">Open on Port 5174 <ExternalLink size={14} /></span>
              </a>

              <a href="http://localhost:5174/login" target="_blank" rel="noopener noreferrer" className="admin-module-card">
                <div className="module-icon-box purple">
                  <Building2 size={24} />
                </div>
                <h3>Gym Verification Queue</h3>
                <p>Inspect business registration documents and owner proof for pending facility approvals.</p>
                <span className="module-launch-link">Open on Port 5174 <ExternalLink size={14} /></span>
              </a>

              <a href="http://localhost:5174/login" target="_blank" rel="noopener noreferrer" className="admin-module-card">
                <div className="module-icon-box amber">
                  <ShoppingBag size={24} />
                </div>
                <h3>Store Orders &amp; Catalog</h3>
                <p>Monitor retail transactions, stock levels, and global marketplace fulfillment.</p>
                <span className="module-launch-link">Open on Port 5174 <ExternalLink size={14} /></span>
              </a>

              <a href="http://localhost:5174/login" target="_blank" rel="noopener noreferrer" className="admin-module-card">
                <div className="module-icon-box red">
                  <ShieldAlert size={24} />
                </div>
                <h3>Complaint &amp; Moderation Desk</h3>
                <p>Triage flagged content, review ban appeals, and resolve member dispute tickets.</p>
                <span className="module-launch-link">Open on Port 5174 <ExternalLink size={14} /></span>
              </a>
            </div>
          </div>
        )}

        {/* ─── Tab 2: Feed ───────────────────────────────────────────────── */}
        {activeTab === 'feed' && (
          <div className="admin-tab-content">
            <div className="admin-post-composer">
              <h3>System Announcements &amp; Broadcasts</h3>
              <p className="composer-sub">Post official platform notices or policy updates to the GymSync public feed.</p>

              <form onSubmit={handleCreatePost}>
                <textarea
                  className="composer-textarea"
                  placeholder="Post an official platform broadcast..."
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  rows={3}
                />

                {selectedPostFile && (
                  <div className="composer-file-preview">
                    <span>Attached: {selectedPostFile.name}</span>
                    <button type="button" onClick={() => setSelectedPostFile(null)} className="btn-remove-attachment">Remove</button>
                  </div>
                )}

                <div className="composer-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => postFileInputRef.current && postFileInputRef.current.click()}
                  >
                    <ImageIcon size={15} /> Add Media
                  </button>
                  <input
                    type="file"
                    ref={postFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && setSelectedPostFile(e.target.files[0])}
                  />

                  <button
                    type="submit"
                    disabled={isPublishingPost}
                    className="btn btn-primary btn-sm"
                  >
                    <Send size={15} />
                    {isPublishingPost ? 'Publishing...' : 'Broadcast to Community'}
                  </button>
                </div>
              </form>
            </div>

            <div className="admin-posts-list">
              {myPosts.length > 0 ? (
                <PostList
                  posts={myPosts}
                  onLike={handleLikePost}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  onAddReply={handleAddReply}
                  onDeleteReply={handleDeleteReply}
                  currentUserName={adminName}
                  currentUserRole={userRole}
                />
              ) : (
                <div className="admin-empty-card">
                  <Send size={36} color="var(--text-secondary)" />
                  <h4>No Broadcasts Published</h4>
                  <p>Broadcast notices to members and gym owners using the composer above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab 3: Settings ───────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="admin-tab-content">
            <div className="admin-settings-grid">
              
              <div className="admin-card">
                <div className="card-header">
                  <ShieldCheck size={18} color="#10b981" />
                  <h3>Security Email</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Registered Email: <strong>{userData?.email || 'None'}</strong>
                </p>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: '12px' }}
                  onClick={() => {
                    setVerifyEmailInput(userData?.email || '');
                    setIsVerifyModalOpen(true);
                  }}
                >
                  {userData?.isEmailVerified ? 'Re-verify Security Email' : 'Verify Email with OTP'}
                </button>
              </div>

              <div className="admin-card">
                <div className="card-header">
                  <Settings size={18} color="var(--primary-accent)" />
                  <h3>Change Master Password</h3>
                </div>
                <form onSubmit={handleChangePassword} className="admin-form">
                  {passwordError && <div className="alert-message error">{passwordError}</div>}
                  {passwordMessage && <div className="alert-message success">{passwordMessage}</div>}

                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  <button type="submit" disabled={isUpdatingPassword} className="btn btn-primary btn-sm">
                    {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

      </div>

      {rawImageSrc && (
        <ImageCropper
          imageSrc={rawImageSrc}
          onCropComplete={onCropComplete}
          onCancel={() => setRawImageSrc(null)}
        />
      )}

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
  );
};

export default AdminProfile;
