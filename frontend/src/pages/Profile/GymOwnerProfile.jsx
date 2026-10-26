import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, ShieldCheck, Users, Dumbbell, MapPin, Phone, Mail, 
  Settings, Camera, ArrowRight, Send, Image as ImageIcon, CheckCircle2, 
  Clock, AlertCircle, Sparkles, PlusCircle, ExternalLink, ShieldAlert,
  Award, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import UserAvatar from '../../components/common/UserAvatar';
import ImageCropper from '../../components/layout/ImageCropper';
import PostList from '../../features/social/components/PostList';
import ProfileVerifyEmailModal from './ProfileVerifyEmailModal';
import { postService } from '../../services/postService';
import './GymOwnerProfile.css';

const GymOwnerProfile = () => {
  const navigate = useNavigate();
  const ownerName = localStorage.getItem('gymsync_user_name') || 'Gym Owner';
  const userKey = ownerName.replace(/\s+/g, '_');
  const token = localStorage.getItem('gymsync_token') || '';

  const [activeTab, setActiveTab] = useState('branches');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [gymDetails, setGymDetails] = useState(null);
  const [dashboardData, setDashboardData] = useState({ members: [], trainers: [] });
  
  // Profile Picture & Cropper
  const [profilePic, setProfilePic] = useState(localStorage.getItem(`gymsync_${userKey}_pic`) || '');
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const fileInputRef = useRef(null);

  // Social / Announcements State
  const [myPosts, setMyPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [selectedPostFile, setSelectedPostFile] = useState(null);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const postFileInputRef = useRef(null);

  // Business Contact Details
  const [contactInfo, setContactInfo] = useState({
    businessEmail: '',
    phone: '',
    city: '',
    organizationName: ''
  });
  const [isSavingContact, setIsSavingContact] = useState(false);

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

  // Load Data
  const loadOwnerData = async () => {
    try {
      setLoading(true);
      // 1. Fetch user data
      const userRes = await fetch(`/api/users/${encodeURIComponent(ownerName)}`);
      if (userRes.ok) {
        const u = await userRes.json();
        setUserData(u);
        if (u.profilePic) {
          setProfilePic(u.profilePic);
          localStorage.setItem(`gymsync_${userKey}_pic`, u.profilePic);
        }
        setContactInfo(prev => ({
          ...prev,
          businessEmail: u.email || '',
          phone: u.phone || u.bioData?.phone || '',
          city: u.bioData?.location || '',
          organizationName: u.organizationName || u.bioData?.organizationName || ''
        }));
        setVerifyEmailInput(u.email || '');
      }

      // 2. Fetch Branches
      const branchesRes = await fetch('/api/gym-verification/branches', { headers: getHeaders() });
      if (branchesRes.ok) {
        const bData = await branchesRes.json();
        if (bData.success && Array.isArray(bData.branches)) {
          setBranches(bData.branches);
        }
      }

      // 3. Fetch Dashboard data for members & trainers
      const dashRes = await fetch(`/api/gym-owner/dashboard/${encodeURIComponent(ownerName)}`, { headers: getHeaders() });
      if (dashRes.ok) {
        const dData = await dashRes.json();
        if (dData.gym && dData.gym._id !== 'gym_demo_id') {
          setGymDetails(dData.gym);
        }
        setDashboardData({
          members: Array.isArray(dData.members) ? dData.members : [],
          trainers: Array.isArray(dData.trainers) ? dData.trainers : []
        });
      }

      // 4. Fetch Owner Posts
      const postsRes = await fetch('/api/posts');
      if (postsRes.ok) {
        const pData = await postsRes.json();
        if (Array.isArray(pData)) {
          setMyPosts(pData.filter(p => p && (p.authorName === ownerName || p.author?.name === ownerName)));
        }
      }
    } catch (err) {
      console.warn('Error loading gym owner profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwnerData();
  }, [ownerName]);

  // Profile Picture Upload & Crop
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
      if (!res.ok) throw new Error(data.message || 'Unable to update profile image.');
      toast.success('Gym logo / profile photo updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Error updating photo');
    }
  };

  // Posts Handlers
  const handleCreatePost = async (e) => {
    if (e) e.preventDefault();
    if (!newPostText.trim() && !selectedPostFile) {
      toast.warning('Please enter an announcement or attach an image.');
      return;
    }
    setIsPublishingPost(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostText);
      formData.append('authorName', ownerName);
      if (selectedPostFile) formData.append('media', selectedPostFile);
      const created = await postService.createPost(formData);
      setMyPosts(prev => [created, ...prev]);
      setNewPostText('');
      setSelectedPostFile(null);
      if (postFileInputRef.current) postFileInputRef.current.value = null;
      toast.success('Facility announcement published!');
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

  // Change Password
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
      toast.success('Security password updated.');
    } catch (err) {
      setPasswordError(err.message || 'Unable to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Save Contact Info
  const handleSaveContact = async (e) => {
    e.preventDefault();
    setIsSavingContact(true);
    try {
      const res = await fetch(`/api/users/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          phone: contactInfo.phone,
          location: contactInfo.city,
          organizationName: contactInfo.organizationName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save business contact details.');
      toast.success('Business contact details updated.');
    } catch (err) {
      toast.error(err.message || 'Error saving contact details');
    } finally {
      setIsSavingContact(false);
    }
  };

  // OTP Email Verification
  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    if (!verifyEmailInput.trim()) return;
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/users/send-verification-otp', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userName: ownerName, email: verifyEmailInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      toast.success(data.message || '6-digit OTP sent to your business email.');
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
        body: JSON.stringify({ userName: ownerName, email: verifyEmailInput.trim(), otp: otpInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP Verification failed');
      setUserData(prev => ({ ...(prev || {}), email: verifyEmailInput.trim(), isEmailVerified: true }));
      setContactInfo(prev => ({ ...prev, businessEmail: verifyEmailInput.trim() }));
      toast.success('Official business email verified!');
      setIsVerifyModalOpen(false);
      setOtpStep(1);
      setOtpInput('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Derived Business Metrics
  const activeBranches = branches.length > 0 ? branches : (gymDetails ? [gymDetails] : []);
  const verifiedCount = activeBranches.filter(b => b.verificationStatus === 'Approved').length;
  const isVerifiedPartner = verifiedCount > 0;
  const primaryOrgName = contactInfo.organizationName || activeBranches[0]?.name || gymDetails?.name || 'GymSync Partner Network';
  const totalMembers = dashboardData.members.length;
  const totalTrainers = dashboardData.trainers.length;

  if (loading) {
    return (
      <div className="gymowner-profile-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={40} color="var(--primary-accent)" />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading Gym Owner Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gymowner-profile-page">
      <div className="gymowner-profile-container">

        {/* ─── Hero Business Header ──────────────────────────────────────── */}
        <section className="gymowner-hero-card">
          <div className="gymowner-hero-top">
            <div className="gymowner-hero-identity">
              {/* Gym Logo / Profile Avatar with Upload */}
              <div className="gymowner-avatar-wrapper">
                {profilePic ? (
                  <img src={profilePic} alt={ownerName} className="gymowner-avatar-img" />
                ) : (
                  <UserAvatar src="" name={ownerName} size={96} />
                )}
                <button
                  type="button"
                  className="gymowner-avatar-edit-btn"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  title="Upload Gym Logo / Photo"
                  aria-label="Upload Gym Logo / Photo"
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

              {/* Title & Badges */}
              <div className="gymowner-hero-details">
                <div className="gymowner-badges-row">
                  <span className="gymowner-badge role">
                    <Building2 size={13} /> Gym Owner &amp; Partner
                  </span>
                  {isVerifiedPartner ? (
                    <span className="gymowner-badge verified">
                      <ShieldCheck size={13} /> Verified Business Partner
                    </span>
                  ) : (
                    <span className="gymowner-badge pending">
                      <Clock size={13} /> Verification in Progress
                    </span>
                  )}
                  <span className="gymowner-badge count">
                    {activeBranches.length} {activeBranches.length === 1 ? 'Branch' : 'Branches'}
                  </span>
                </div>

                <h1>{ownerName}</h1>
                <p className="gymowner-org-name">
                  <strong>{primaryOrgName}</strong>
                </p>

                <div className="gymowner-contact-chips">
                  {userData?.email && (
                    <span className="contact-chip">
                      <Mail size={13} /> {userData.email}
                      {userData.isEmailVerified && <CheckCircle2 size={12} color="#10b981" title="Verified" />}
                    </span>
                  )}
                  {contactInfo.phone && (
                    <span className="contact-chip">
                      <Phone size={13} /> {contactInfo.phone}
                    </span>
                  )}
                  {contactInfo.city && (
                    <span className="contact-chip">
                      <MapPin size={13} /> {contactInfo.city}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Button to Management Portal */}
            <div className="gymowner-hero-actions">
              <Link to="/gym-owner" className="btn btn-primary gymowner-panel-cta">
                <Building2 size={18} />
                <span>Open Gym Management Panel</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Business Metrics Grid */}
          <div className="gymowner-stats-grid">
            <div className="gymowner-stat-card">
              <div className="stat-icon-box purple">
                <Building2 size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{activeBranches.length}</div>
                <div className="stat-lbl">Managed Facilities</div>
              </div>
            </div>

            <div className="gymowner-stat-card">
              <div className="stat-icon-box green">
                <CheckCircle2 size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{verifiedCount}</div>
                <div className="stat-lbl">Verified Branches</div>
              </div>
            </div>

            <div className="gymowner-stat-card">
              <div className="stat-icon-box blue">
                <Users size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{totalMembers}</div>
                <div className="stat-lbl">Enrolled Members</div>
              </div>
            </div>

            <div className="gymowner-stat-card">
              <div className="stat-icon-box orange">
                <Dumbbell size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{totalTrainers}</div>
                <div className="stat-lbl">Coaches &amp; Trainers</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Navigation Tabs ───────────────────────────────────────────── */}
        <div className="gymowner-tabs-bar">
          <button
            className={`gymowner-tab-btn ${activeTab === 'branches' ? 'active' : ''}`}
            onClick={() => setActiveTab('branches')}
          >
            <Building2 size={17} />
            <span>Facilities &amp; Branches</span>
            <span className="tab-pill">{activeBranches.length}</span>
          </button>

          <button
            className={`gymowner-tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            <Send size={17} />
            <span>Announcements &amp; Feed</span>
            <span className="tab-pill">{myPosts.length}</span>
          </button>

          <button
            className={`gymowner-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={17} />
            <span>Business Settings &amp; Security</span>
          </button>
        </div>

        {/* ─── Tab 1: Facilities & Branches ───────────────────────────────── */}
        {activeTab === 'branches' && (
          <div className="gymowner-tab-content">
            <div className="gymowner-section-header">
              <div>
                <h2>Managed Gym Branches</h2>
                <p>Overview of your gym facilities, operational status, and member access.</p>
              </div>
              <Link to="/gym-owner" className="btn btn-outline btn-sm">
                <PlusCircle size={15} /> Add / Verify Branch
              </Link>
            </div>

            {activeBranches.length > 0 ? (
              <div className="gymowner-branches-grid">
                {activeBranches.map((branch, idx) => {
                  const status = branch.verificationStatus || (branch.isVerified ? 'Approved' : 'Pending');
                  const isApproved = status === 'Approved';
                  const isPending = status === 'Pending Review' || status === 'Pending';
                  const amenities = Array.isArray(branch.amenities) ? branch.amenities : [];

                  return (
                    <div key={branch._id || branch.id || idx} className="gymowner-branch-card">
                      <div className="branch-card-header">
                        <div>
                          <h3 className="branch-card-title">{branch.branchName || branch.name || 'Gym Facility'}</h3>
                          <p className="branch-card-org">{branch.organizationName || branch.gymName || primaryOrgName}</p>
                        </div>
                        <span className={`branch-status-pill ${isApproved ? 'approved' : isPending ? 'pending' : 'draft'}`}>
                          {isApproved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {status}
                        </span>
                      </div>

                      <div className="branch-card-body">
                        <div className="branch-info-row">
                          <MapPin size={15} color="var(--primary-accent)" />
                          <span>
                            {branch.address ? `${branch.address}, ` : ''}
                            <strong>{branch.city || 'Location on file'}</strong>
                            {branch.postalCode ? ` (${branch.postalCode})` : ''}
                          </span>
                        </div>

                        {branch.phone && (
                          <div className="branch-info-row">
                            <Phone size={15} color="var(--primary-accent)" />
                            <span>{branch.phone}</span>
                          </div>
                        )}

                        <div className="branch-pricing-pills">
                          <div className="pricing-pill">
                            <span className="price-lbl">Monthly Pass</span>
                            <span className="price-val">${branch.monthlyFee || 0}</span>
                          </div>
                          <div className="pricing-pill">
                            <span className="price-lbl">Admission Fee</span>
                            <span className="price-val">${branch.admissionFee || 0}</span>
                          </div>
                        </div>

                        {amenities.length > 0 && (
                          <div className="branch-amenities-wrap">
                            <span className="amenities-title">Amenities:</span>
                            <div className="amenities-chips">
                              {amenities.slice(0, 6).map((am, aIdx) => (
                                <span key={aIdx} className="amenity-chip">{am}</span>
                              ))}
                              {amenities.length > 6 && (
                                <span className="amenity-chip more">+{amenities.length - 6} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="branch-card-footer">
                        <Link to="/gym-owner" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                          <Building2 size={15} /> Manage in Gym Panel
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="gymowner-empty-card">
                <Building2 size={48} color="var(--text-secondary)" />
                <h3>No Facilities Registered Yet</h3>
                <p>Register your first gym branch to start onboarding members, assigning trainers, and completing business verification.</p>
                <Link to="/gym-owner" className="btn btn-primary" style={{ marginTop: '16px' }}>
                  Register Gym Facility
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ─── Tab 2: Announcements & Feed ────────────────────────────────── */}
        {activeTab === 'feed' && (
          <div className="gymowner-tab-content">
            <div className="gymowner-feed-layout">
              {/* Publisher Card */}
              <div className="gymowner-post-composer">
                <h3>Facility Announcements &amp; Member Updates</h3>
                <p className="composer-sub">Share news, equipment upgrades, holiday timings, or special offers with your gym community.</p>

                <form onSubmit={handleCreatePost}>
                  <textarea
                    className="composer-textarea"
                    placeholder="Write an announcement for your members..."
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
                      <ImageIcon size={15} /> Add Photo
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
                      {isPublishingPost ? 'Publishing...' : 'Publish Announcement'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Feed List */}
              <div className="gymowner-posts-list">
                {myPosts.length > 0 ? (
                  <PostList
                    posts={myPosts}
                    onLike={handleLikePost}
                    onAddComment={handleAddComment}
                    onDeleteComment={handleDeleteComment}
                    onAddReply={handleAddReply}
                    onDeleteReply={handleDeleteReply}
                    currentUserName={ownerName}
                    currentUserRole="GymOwner"
                  />
                ) : (
                  <div className="gymowner-empty-card">
                    <Send size={36} color="var(--text-secondary)" />
                    <h4>No Announcements Published</h4>
                    <p>Use the composer above to share updates with your members.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab 3: Business Settings & Security ────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="gymowner-tab-content">
            <div className="gymowner-settings-grid">
              
              {/* Business Contact Form */}
              <div className="gymowner-card">
                <div className="card-header">
                  <Building2 size={18} color="var(--primary-accent)" />
                  <h3>Business Details</h3>
                </div>
                <form onSubmit={handleSaveContact} className="gymowner-form">
                  <div className="form-group">
                    <label>Gym Organization / Brand Name</label>
                    <input
                      type="text"
                      value={contactInfo.organizationName}
                      onChange={(e) => setContactInfo({ ...contactInfo, organizationName: e.target.value })}
                      placeholder="e.g. IronCore Fitness Network"
                    />
                  </div>

                  <div className="form-group">
                    <label>Business Contact Phone</label>
                    <input
                      type="tel"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div className="form-group">
                    <label>Headquarters / Primary City</label>
                    <input
                      type="text"
                      value={contactInfo.city}
                      onChange={(e) => setContactInfo({ ...contactInfo, city: e.target.value })}
                      placeholder="e.g. New York, NY"
                    />
                  </div>

                  <button type="submit" disabled={isSavingContact} className="btn btn-primary btn-sm">
                    {isSavingContact ? 'Saving...' : 'Save Business Details'}
                  </button>
                </form>
              </div>

              {/* Email Authentication & Verification */}
              <div className="gymowner-card">
                <div className="card-header">
                  <ShieldCheck size={18} color="#10b981" />
                  <h3>Email &amp; Partner Verification</h3>
                </div>
                <div className="email-status-box">
                  <p>
                    Official Email: <strong>{userData?.email || 'No email registered'}</strong>
                  </p>
                  {userData?.isEmailVerified ? (
                    <div className="verified-status-tag success">
                      <CheckCircle2 size={16} /> Verified Google Gmail
                    </div>
                  ) : (
                    <div className="verified-status-tag warning">
                      <AlertCircle size={16} /> Email unverified
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: '12px' }}
                    onClick={() => {
                      setVerifyEmailInput(userData?.email || '');
                      setIsVerifyModalOpen(true);
                    }}
                  >
                    {userData?.isEmailVerified ? 'Re-verify Business Email' : 'Verify Email with OTP'}
                  </button>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Verification Status</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Branch verification requires government business registration and ownership proof documents reviewed by compliance.
                  </p>
                  <Link to="/gym-owner" className="btn btn-outline btn-sm" style={{ marginTop: '12px' }}>
                    <ShieldCheck size={14} /> View Verification Center
                  </Link>
                </div>
              </div>

              {/* Security & Password Change */}
              <div className="gymowner-card full-width">
                <div className="card-header">
                  <Award size={18} color="var(--primary-accent)" />
                  <h3>Security &amp; Password</h3>
                </div>
                <form onSubmit={handleChangePassword} className="gymowner-form">
                  {passwordError && <div className="alert-message error">{passwordError}</div>}
                  {passwordMessage && <div className="alert-message success">{passwordMessage}</div>}

                  <div className="form-row-3">
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
                  </div>

                  <button type="submit" disabled={isUpdatingPassword} className="btn btn-primary btn-sm">
                    {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Image Cropper Modal */}
      {rawImageSrc && (
        <ImageCropper
          imageSrc={rawImageSrc}
          onCropComplete={onCropComplete}
          onCancel={() => setRawImageSrc(null)}
        />
      )}

      {/* Email Verification OTP Modal */}
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

export default GymOwnerProfile;
