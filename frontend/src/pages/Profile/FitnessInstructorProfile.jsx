import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, Dumbbell, Utensils, BookOpen, Settings, Camera, 
  ArrowRight, Send, Image as ImageIcon, CheckCircle2, Clock, 
  ShieldCheck, RefreshCw, AlertCircle, PlusCircle, Sparkles, Award
} from 'lucide-react';
import { toast } from 'react-toastify';
import UserAvatar from '../../components/common/UserAvatar';
import ImageCropper from '../../components/layout/ImageCropper';
import PostList from '../../features/social/components/PostList';
import ProfileVerifyEmailModal from './ProfileVerifyEmailModal';
import { postService } from '../../services/postService';
import './FitnessInstructorProfile.css';

const FitnessInstructorProfile = () => {
  const instructorName = localStorage.getItem('gymsync_user_name') || 'Fitness Instructor';
  const userKey = instructorName.replace(/\s+/g, '_');
  const token = localStorage.getItem('gymsync_token') || '';

  const [activeTab, setActiveTab] = useState('content');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  
  // Instructor Content Collections
  const [programs, setPrograms] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [articles, setArticles] = useState([]);

  // Profile Picture & Cropper
  const [profilePic, setProfilePic] = useState(localStorage.getItem(`gymsync_${userKey}_pic`) || '');
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const fileInputRef = useRef(null);

  // Social / Posts State
  const [myPosts, setMyPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [selectedPostFile, setSelectedPostFile] = useState(null);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const postFileInputRef = useRef(null);

  // Instructor Credentials State
  const [bioText, setBioText] = useState('');
  const [specialties, setSpecialties] = useState([]);
  const [isSavingBio, setIsSavingBio] = useState(false);

  // Password / Security State
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
      // User data
      const userRes = await fetch(`/api/users/${encodeURIComponent(instructorName)}`);
      if (userRes.ok) {
        const u = await userRes.json();
        setUserData(u);
        if (u.profilePic) {
          setProfilePic(u.profilePic);
          localStorage.setItem(`gymsync_${userKey}_pic`, u.profilePic);
        }
        if (u.bioData?.instructorBio) setBioText(u.bioData.instructorBio);
        if (u.bioData?.specialties) setSpecialties(u.bioData.specialties);
        setVerifyEmailInput(u.email || '');
      }

      // Plans & Content
      const [plansRes, articlesRes] = await Promise.all([
        fetch('/api/plans/premade', { headers: getHeaders() }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/articles', { headers: getHeaders() }).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      const plansArr = Array.isArray(plansRes) ? plansRes : [];
      setPrograms(plansArr.filter(p => p.type === 'workout' || !p.type));
      setDietPlans(plansArr.filter(p => p.type === 'diet'));
      setArticles(Array.isArray(articlesRes) ? articlesRes : []);

      // Posts
      const postsRes = await fetch('/api/posts');
      if (postsRes.ok) {
        const pData = await postsRes.json();
        if (Array.isArray(pData)) {
          setMyPosts(pData.filter(p => p && (p.authorName === instructorName || p.author?.name === instructorName)));
        }
      }
    } catch (err) {
      console.warn('Error loading instructor profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instructorName]);

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
      toast.success('Instructor profile photo updated.');
    } catch (err) {
      toast.error(err.message || 'Error updating photo');
    }
  };

  const handleCreatePost = async (e) => {
    if (e) e.preventDefault();
    if (!newPostText.trim() && !selectedPostFile) {
      toast.warning('Please enter educational content or attach an image.');
      return;
    }
    setIsPublishingPost(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostText);
      formData.append('authorName', instructorName);
      if (selectedPostFile) formData.append('media', selectedPostFile);
      const created = await postService.createPost(formData);
      setMyPosts(prev => [created, ...prev]);
      setNewPostText('');
      setSelectedPostFile(null);
      if (postFileInputRef.current) postFileInputRef.current.value = null;
      toast.success('Guidance note published to community feed!');
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

  const handleSaveBio = async (e) => {
    e.preventDefault();
    setIsSavingBio(true);
    try {
      const res = await fetch(`/api/users/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          bioData: {
            ...(userData?.bioData || {}),
            instructorBio: bioText,
            specialties
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save credentials.');
      toast.success('Instructor credentials & bio updated.');
    } catch (err) {
      toast.error(err.message || 'Error saving bio');
    } finally {
      setIsSavingBio(false);
    }
  };

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
      toast.success('Password updated.');
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
        body: JSON.stringify({ userName: instructorName, email: verifyEmailInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      toast.success('6-digit OTP sent to your email.');
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
        body: JSON.stringify({ userName: instructorName, email: verifyEmailInput.trim(), otp: otpInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP Verification failed');
      setUserData(prev => ({ ...(prev || {}), email: verifyEmailInput.trim(), isEmailVerified: true }));
      toast.success('Instructor email verified!');
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
      <div className="instructor-profile-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={40} color="var(--primary-accent)" />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading Fitness Instructor Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="instructor-profile-page">
      <div className="instructor-profile-container">

        {/* ─── Hero Card ─────────────────────────────────────────────────── */}
        <section className="instructor-hero-card">
          <div className="instructor-hero-top">
            <div className="instructor-hero-identity">
              <div className="instructor-avatar-wrapper">
                {profilePic ? (
                  <img src={profilePic} alt={instructorName} className="instructor-avatar-img" />
                ) : (
                  <UserAvatar src="" name={instructorName} size={96} />
                )}
                <button
                  type="button"
                  className="instructor-avatar-edit-btn"
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

              <div className="instructor-hero-details">
                <div className="instructor-badges-row">
                  <span className="instructor-badge role">
                    <Activity size={13} /> Fitness Instructor
                  </span>
                  <span className="instructor-badge verified">
                    <Award size={13} /> Curriculum Master
                  </span>
                </div>

                <h1>{instructorName}</h1>
                <p className="instructor-org-name">Certified Fitness Instructor &amp; Master Programmer</p>

                <div className="instructor-contact-chips">
                  {userData?.email && (
                    <span className="contact-chip">
                      {userData.email}
                      {userData.isEmailVerified && <CheckCircle2 size={12} color="#10b981" title="Verified" />}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="instructor-hero-actions">
              <Link to="/fitness-instructor" className="btn btn-primary instructor-panel-cta">
                <Activity size={18} />
                <span>Instructor Studio</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="instructor-stats-grid">
            <div className="instructor-stat-card">
              <div className="stat-icon-box green">
                <Dumbbell size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{programs.length}</div>
                <div className="stat-lbl">Workout Programs</div>
              </div>
            </div>

            <div className="instructor-stat-card">
              <div className="stat-icon-box orange">
                <Utensils size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{dietPlans.length}</div>
                <div className="stat-lbl">Nutrition Diets</div>
              </div>
            </div>

            <div className="instructor-stat-card">
              <div className="stat-icon-box blue">
                <BookOpen size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{articles.length}</div>
                <div className="stat-lbl">Published Articles</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Tabs ──────────────────────────────────────────────────────── */}
        <div className="instructor-tabs-bar">
          <button
            className={`instructor-tab-btn ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            <Dumbbell size={17} />
            <span>Programs &amp; Guides</span>
            <span className="tab-pill">{programs.length + dietPlans.length}</span>
          </button>

          <button
            className={`instructor-tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            <Send size={17} />
            <span>Community Guidance</span>
            <span className="tab-pill">{myPosts.length}</span>
          </button>

          <button
            className={`instructor-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={17} />
            <span>Credentials &amp; Security</span>
          </button>
        </div>

        {/* ─── Tab 1: Content ────────────────────────────────────────────── */}
        {activeTab === 'content' && (
          <div className="instructor-tab-content">
            <div className="instructor-section-header">
              <div>
                <h2>Authored Programs &amp; Content</h2>
                <p>Curriculum designed by you for community members and trainees.</p>
              </div>
              <Link to="/fitness-instructor" className="btn btn-outline btn-sm">
                <PlusCircle size={15} /> Create in Studio
              </Link>
            </div>

            <div className="instructor-cards-grid">
              {programs.concat(dietPlans).slice(0, 8).map((item, idx) => (
                <div key={item._id || idx} className="instructor-item-card">
                  <div className="item-card-header">
                    <span className={`item-type-badge ${item.type === 'diet' ? 'diet' : 'workout'}`}>
                      {item.type === 'diet' ? <Utensils size={12} /> : <Dumbbell size={12} />}
                      {item.type === 'diet' ? 'Diet Plan' : 'Workout Program'}
                    </span>
                    <span className="item-level-tag">{item.level || 'All Levels'}</span>
                  </div>
                  <h4 className="item-card-title">{item.title || item.name}</h4>
                  <p className="item-card-desc">{item.description ? item.description.slice(0, 100) + '...' : 'Structured training program.'}</p>
                  <div className="item-card-footer">
                    <Link to="/fitness-instructor" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                      Edit in Studio
                    </Link>
                  </div>
                </div>
              ))}

              {programs.length === 0 && dietPlans.length === 0 && (
                <div className="instructor-empty-card" style={{ gridColumn: '1 / -1' }}>
                  <Dumbbell size={48} color="var(--text-secondary)" />
                  <h3>No Programs Created Yet</h3>
                  <p>Launch the Instructor Studio to create workout programs, exercise templates, and nutritional meal plans.</p>
                  <Link to="/fitness-instructor" className="btn btn-primary" style={{ marginTop: '16px' }}>
                    Open Instructor Studio
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab 2: Feed ───────────────────────────────────────────────── */}
        {activeTab === 'feed' && (
          <div className="instructor-tab-content">
            <div className="instructor-post-composer">
              <h3>Share Coaching Guidance &amp; Tips</h3>
              <p className="composer-sub">Post workout tips, biomechanics advice, or nutritional insights to the GymSync community feed.</p>

              <form onSubmit={handleCreatePost}>
                <textarea
                  className="composer-textarea"
                  placeholder="Share training guidance or nutritional advice..."
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
                    {isPublishingPost ? 'Publishing...' : 'Publish to Feed'}
                  </button>
                </div>
              </form>
            </div>

            <div className="instructor-posts-list">
              {myPosts.length > 0 ? (
                <PostList
                  posts={myPosts}
                  onLike={handleLikePost}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  onAddReply={handleAddReply}
                  onDeleteReply={handleDeleteReply}
                  currentUserName={instructorName}
                  currentUserRole="FitnessInstructor"
                />
              ) : (
                <div className="instructor-empty-card">
                  <Send size={36} color="var(--text-secondary)" />
                  <h4>No Guidance Posts Yet</h4>
                  <p>Share training tips and workout advice using the composer above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab 3: Credentials & Security ─────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="instructor-tab-content">
            <div className="instructor-settings-grid">
              
              <div className="instructor-card">
                <div className="card-header">
                  <Award size={18} color="#10b981" />
                  <h3>Instructor Credentials</h3>
                </div>
                <form onSubmit={handleSaveBio} className="instructor-form">
                  <div className="form-group">
                    <label>Instructor Bio / Philosophy</label>
                    <textarea
                      rows={4}
                      value={bioText}
                      onChange={(e) => setBioText(e.target.value)}
                      placeholder="Describe your training methodology, certifications, and coaching background..."
                    />
                  </div>
                  <button type="submit" disabled={isSavingBio} className="btn btn-primary btn-sm">
                    {isSavingBio ? 'Saving...' : 'Save Credentials'}
                  </button>
                </form>
              </div>

              <div className="instructor-card">
                <div className="card-header">
                  <ShieldCheck size={18} color="#10b981" />
                  <h3>Email Verification</h3>
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
                  {userData?.isEmailVerified ? 'Re-verify Email' : 'Verify Email with OTP'}
                </button>
              </div>

              <div className="instructor-card full-width">
                <div className="card-header">
                  <Settings size={18} color="var(--primary-accent)" />
                  <h3>Security &amp; Password</h3>
                </div>
                <form onSubmit={handleChangePassword} className="instructor-form">
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

export default FitnessInstructorProfile;
