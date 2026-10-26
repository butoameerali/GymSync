import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, Package, DollarSign, Tag, TrendingUp, Settings, 
  Camera, ArrowRight, Send, Image as ImageIcon, CheckCircle2, 
  Clock, ShieldCheck, RefreshCw, AlertCircle, PlusCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import UserAvatar from '../../components/common/UserAvatar';
import ImageCropper from '../../components/layout/ImageCropper';
import PostList from '../../features/social/components/PostList';
import ProfileVerifyEmailModal from './ProfileVerifyEmailModal';
import { postService } from '../../services/postService';
import './StoreManagerProfile.css';

const StoreManagerProfile = () => {
  const managerName = localStorage.getItem('gymsync_user_name') || 'Store Manager';
  const userKey = managerName.replace(/\s+/g, '_');
  const token = localStorage.getItem('gymsync_token') || '';

  const [activeTab, setActiveTab] = useState('catalog');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [products, setProducts] = useState([]);
  
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
      const userRes = await fetch(`/api/users/${encodeURIComponent(managerName)}`);
      if (userRes.ok) {
        const u = await userRes.json();
        setUserData(u);
        if (u.profilePic) {
          setProfilePic(u.profilePic);
          localStorage.setItem(`gymsync_${userKey}_pic`, u.profilePic);
        }
        setVerifyEmailInput(u.email || '');
      }

      // Products data
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const pData = await prodRes.json();
        const prods = Array.isArray(pData) ? pData : (pData.products || []);
        setProducts(prods);
      }

      // Posts
      const postsRes = await fetch('/api/posts');
      if (postsRes.ok) {
        const pData = await postsRes.json();
        if (Array.isArray(pData)) {
          setMyPosts(pData.filter(p => p && (p.authorName === managerName || p.author?.name === managerName)));
        }
      }
    } catch (err) {
      console.warn('Error loading store manager profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [managerName]);

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
      toast.success('Store manager profile photo updated.');
    } catch (err) {
      toast.error(err.message || 'Error updating photo');
    }
  };

  const handleCreatePost = async (e) => {
    if (e) e.preventDefault();
    if (!newPostText.trim() && !selectedPostFile) {
      toast.warning('Please enter a product announcement or attach a photo.');
      return;
    }
    setIsPublishingPost(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostText);
      formData.append('authorName', managerName);
      if (selectedPostFile) formData.append('media', selectedPostFile);
      const created = await postService.createPost(formData);
      setMyPosts(prev => [created, ...prev]);
      setNewPostText('');
      setSelectedPostFile(null);
      if (postFileInputRef.current) postFileInputRef.current.value = null;
      toast.success('Store announcement published to feed!');
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
      toast.success('Security password updated.');
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
        body: JSON.stringify({ userName: managerName, email: verifyEmailInput.trim() })
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
        body: JSON.stringify({ userName: managerName, email: verifyEmailInput.trim(), otp: otpInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP Verification failed');
      setUserData(prev => ({ ...(prev || {}), email: verifyEmailInput.trim(), isEmailVerified: true }));
      toast.success('Store manager email verified!');
      setIsVerifyModalOpen(false);
      setOtpStep(1);
      setOtpInput('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const inStockCount = products.filter(p => (p.countInStock || p.stock || 0) > 0).length;
  const categoriesCount = new Set(products.map(p => p.category)).size;

  if (loading) {
    return (
      <div className="storemanager-profile-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={40} color="var(--primary-accent)" />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading Store Manager Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="storemanager-profile-page">
      <div className="storemanager-profile-container">

        {/* ─── Hero Card ─────────────────────────────────────────────────── */}
        <section className="storemanager-hero-card">
          <div className="storemanager-hero-top">
            <div className="storemanager-hero-identity">
              <div className="storemanager-avatar-wrapper">
                {profilePic ? (
                  <img src={profilePic} alt={managerName} className="storemanager-avatar-img" />
                ) : (
                  <UserAvatar src="" name={managerName} size={96} />
                )}
                <button
                  type="button"
                  className="storemanager-avatar-edit-btn"
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

              <div className="storemanager-hero-details">
                <div className="storemanager-badges-row">
                  <span className="storemanager-badge role">
                    <ShoppingBag size={13} /> Store Manager
                  </span>
                  <span className="storemanager-badge verified">
                    <ShieldCheck size={13} /> Official Merchandiser
                  </span>
                </div>

                <h1>{managerName}</h1>
                <p className="storemanager-org-name">GymSync Official Retail &amp; Equipment Store</p>

                <div className="storemanager-contact-chips">
                  {userData?.email && (
                    <span className="contact-chip">
                      {userData.email}
                      {userData.isEmailVerified && <CheckCircle2 size={12} color="#10b981" title="Verified" />}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="storemanager-hero-actions">
              <Link to="/store-manager" className="btn btn-primary storemanager-panel-cta">
                <ShoppingBag size={18} />
                <span>Store Management Desk</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="storemanager-stats-grid">
            <div className="storemanager-stat-card">
              <div className="stat-icon-box amber">
                <Package size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{products.length}</div>
                <div className="stat-lbl">Catalog Products</div>
              </div>
            </div>

            <div className="storemanager-stat-card">
              <div className="stat-icon-box green">
                <CheckCircle2 size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{inStockCount}</div>
                <div className="stat-lbl">In-Stock Items</div>
              </div>
            </div>

            <div className="storemanager-stat-card">
              <div className="stat-icon-box blue">
                <Tag size={20} />
              </div>
              <div className="stat-info">
                <div className="stat-val">{categoriesCount}</div>
                <div className="stat-lbl">Product Categories</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Tabs ──────────────────────────────────────────────────────── */}
        <div className="storemanager-tabs-bar">
          <button
            className={`storemanager-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <Package size={17} />
            <span>Catalog Highlights</span>
            <span className="tab-pill">{products.length}</span>
          </button>

          <button
            className={`storemanager-tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            <Send size={17} />
            <span>Store Drops &amp; Feed</span>
            <span className="tab-pill">{myPosts.length}</span>
          </button>

          <button
            className={`storemanager-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={17} />
            <span>Account &amp; Security</span>
          </button>
        </div>

        {/* ─── Tab 1: Catalog Highlights ─────────────────────────────────── */}
        {activeTab === 'catalog' && (
          <div className="storemanager-tab-content">
            <div className="storemanager-section-header">
              <div>
                <h2>Store Catalog Inventory</h2>
                <p>Preview products currently active in the GymSync store.</p>
              </div>
              <Link to="/store-manager" className="btn btn-outline btn-sm">
                <PlusCircle size={15} /> Manage Catalog
              </Link>
            </div>

            {products.length > 0 ? (
              <div className="storemanager-products-grid">
                {products.slice(0, 12).map((prod, idx) => (
                  <div key={prod._id || idx} className="storemanager-product-card">
                    {prod.image && (
                      <div className="product-card-img-wrap">
                        <img src={prod.image} alt={prod.name} />
                      </div>
                    )}
                    <div className="product-card-body">
                      <span className="product-category-chip">{prod.category || 'General'}</span>
                      <h4 className="product-card-title">{prod.name}</h4>
                      <div className="product-card-price-row">
                        <span className="product-price">${prod.price}</span>
                        <span className={`stock-badge ${(prod.countInStock || prod.stock || 0) > 0 ? 'in-stock' : 'out-of-stock'}`}>
                          {(prod.countInStock || prod.stock || 0) > 0 ? `${prod.countInStock || prod.stock} in stock` : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="storemanager-empty-card">
                <Package size={48} color="var(--text-secondary)" />
                <h3>No Products Found</h3>
                <p>Launch the Store Management Desk to add inventory and manage product listings.</p>
                <Link to="/store-manager" className="btn btn-primary" style={{ marginTop: '16px' }}>
                  Open Store Manager
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ─── Tab 2: Feed ───────────────────────────────────────────────── */}
        {activeTab === 'feed' && (
          <div className="storemanager-tab-content">
            <div className="storemanager-post-composer">
              <h3>Product Drops &amp; Store Announcements</h3>
              <p className="composer-sub">Announce newly arrived gear, supplements, or exclusive store discounts to the community.</p>

              <form onSubmit={handleCreatePost}>
                <textarea
                  className="composer-textarea"
                  placeholder="Announce a product drop, restock, or sale event..."
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

            <div className="storemanager-posts-list">
              {myPosts.length > 0 ? (
                <PostList
                  posts={myPosts}
                  onLike={handleLikePost}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  onAddReply={handleAddReply}
                  onDeleteReply={handleDeleteReply}
                  currentUserName={managerName}
                  currentUserRole="StoreManager"
                />
              ) : (
                <div className="storemanager-empty-card">
                  <Send size={36} color="var(--text-secondary)" />
                  <h4>No Announcements Yet</h4>
                  <p>Share store updates and product promotions using the composer above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab 3: Settings ───────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="storemanager-tab-content">
            <div className="storemanager-settings-grid">
              
              <div className="storemanager-card">
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

              <div className="storemanager-card">
                <div className="card-header">
                  <Settings size={18} color="var(--primary-accent)" />
                  <h3>Security &amp; Password</h3>
                </div>
                <form onSubmit={handleChangePassword} className="storemanager-form">
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

export default StoreManagerProfile;
