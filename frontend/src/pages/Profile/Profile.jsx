import React, { useState, useEffect, useRef } from 'react';
import { Activity, Flame, Target, MapPin, Calendar, CheckCircle, Clock, DownloadCloud, Trash2, Shield, Lock, Camera, Building } from 'lucide-react';
import ImageCropper from '../../components/layout/ImageCropper';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import './Profile.css';

const Profile = () => {
  const userRole = localStorage.getItem('gymsync_role') || 'User';
  const isTrainee = userRole === 'User' || userRole === 'Guest';
  const [activeTab, setActiveTab] = useState(() => (userRole === 'GymOwner' ? 'gig' : (isTrainee ? 'history' : 'posts')));
  const [isEditingBio, setIsEditingBio] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({ points: 0, streak: 0 });
  const [history, setHistory] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [myGymGig, setMyGymGig] = useState(null);
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const userKey = userName.replace(/\s+/g, '_'); // normalize for local storage key
  const [profilePic, setProfilePic] = useState(localStorage.getItem(`gymsync_${userKey}_pic`) || '');
  const [userData, setUserData] = useState(null);
  const [rawImageSrc, setRawImageSrc] = useState(null);

  // Bio Data
  const [bio, setBio] = useState({
    height: '',
    weight: '',
    bodyType: 'healthy',
    fitnessGoals: '',
    location: ''
  });

  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  // Email Verification Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyEmailInput, setVerifyEmailInput] = useState('');
  const [otpStep, setOtpStep] = useState(1);
  const [otpInput, setOtpInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    if (!verifyEmailInput.trim()) return;
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/users/send-verification-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ userName, email: verifyEmailInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');

      toast.success(data.message || '6-digit OTP sent to your Gmail address. Please check your inbox.');
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
          Authorization: `Bearer ${localStorage.getItem('gymsync_token') || ''}`
        },
        body: JSON.stringify({ userName, email: verifyEmailInput.trim(), otp: otpInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP Verification failed');

      setUserData(prev => ({ ...(prev || {}), email: verifyEmailInput.trim(), isEmailVerified: true, isGoogleApproved: true }));
      toast.success('✅ Google Gmail authenticated & verified successfully!');
      setIsVerifyModalOpen(false);
      setOtpStep(1);
      setOtpInput('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  useEffect(() => {
    // Load local storage states for FYP Demo, scoped to userName
    const mockPoints = localStorage.getItem(`gymsync_${userKey}_points`) || '0';
    const mockStreak = localStorage.getItem(`gymsync_${userKey}_streak`) || '0';
    setStats({ points: parseInt(mockPoints), streak: parseInt(mockStreak) });

    const rawHistory = JSON.parse(localStorage.getItem(`gymsync_${userKey}_history`) || '[]');
    setHistory(rawHistory.reverse()); // Newest first

    // Function to load and sync bio data dynamically
    const loadBioData = () => {
      const bioFilled = localStorage.getItem(`gymsync_${userKey}_bio_filled`) === 'true' || localStorage.getItem('gymsync_bio_filled') === 'true';
      if (bioFilled) {
        const storedBio = localStorage.getItem(`gymsync_${userKey}_bio_data`) || localStorage.getItem(`gymsync_${userKey}_bio`);
        if (storedBio) {
          try {
            setBio(JSON.parse(storedBio));
            setUpcoming([
              { id: 'u1', name: 'Barbell Squats', date: 'Tomorrow, 8:00 AM' },
              { id: 'u2', name: 'Romanian Deadlifts', date: 'Tomorrow, 8:30 AM' }
            ]);
          } catch (e) {
            console.error("Error parsing bio data", e);
          }
        }
      }
    };

    loadBioData();
    window.addEventListener('gymsync_bio_updated', loadBioData);

    const fetches = [];

    if (userName !== 'Guest User') {
      fetches.push(
        fetch(`/api/users/${userName}`)
          .then(res => res.json())
          .then(user => {
            if (user) {
              setUserData(user);
              if (user.profilePic) {
                setProfilePic(user.profilePic);
                localStorage.setItem(`gymsync_${userKey}_pic`, user.profilePic);
              }
            }
          })
          .catch(err => console.error("Error fetching profile from DB:", err))
      );
    }

    fetches.push(
      fetch('/api/posts')
        .then(res => res.json())
        .then(data => {
          if(Array.isArray(data)) {
            setMyPosts(data.filter(p => p.authorName === userName || p.author?.name === userName));
          }
        })
        .catch(err => console.error(err))
    );

    const role = localStorage.getItem('gymsync_role');
    if (role === 'GymOwner') {
      setActiveTab('gig');
      fetches.push(
        fetch(`/api/gym-owner/dashboard/${userName}`, {
          headers: {
            'x-user-name': userName,
            'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
          }
        })
        .then(res => res.json())
        .then(data => {
          if (data.gym && data.gym._id !== 'gym_demo_id') {
            setMyGymGig(data.gym);
          }
        })
        .catch(err => console.error('Error fetching gym gig', err))
      );
    } else if (!isTrainee) {
      setActiveTab('posts');
    }

    Promise.allSettled(fetches).then(() => {
      setIsLoading(false);
    });

    return () => {
      window.removeEventListener('gymsync_bio_updated', loadBioData);
    };
  }, [userKey, userName]);

  const [validationErrors, setValidationErrors] = useState([]);
  const [hideHealthData, setHideHealthData] = useState(() => localStorage.getItem('gymsync_privacy_hideHealth') === 'true');
  const isAdminUser = ['SuperAdmin', 'Admin', 'ComplaintModerator'].includes(userRole);
  const authToken = localStorage.getItem('gymsync_token');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSaveBio = async (e) => {
    e.preventDefault();
    const errors = [];

    if (bio.weight && (isNaN(bio.weight) || Number(bio.weight) <= 0 || Number(bio.weight) > 400)) {
      errors.push("Please enter a valid weight between 1 and 400.");
    }
    if (bio.height && (isNaN(bio.height) || Number(bio.height) <= 0 || Number(bio.height) > 300)) {
      errors.push("Please enter a valid height between 1 and 300.");
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    localStorage.setItem(`gymsync_${userKey}_bio_filled`, 'true');
    localStorage.setItem('gymsync_bio_filled', 'true');
    localStorage.setItem(`gymsync_${userKey}_bio_data`, JSON.stringify(bio));
    localStorage.setItem(`gymsync_${userKey}_bio`, JSON.stringify(bio));
    
    if (profilePic) await saveProfilePic(profilePic);
    
    setIsEditingBio(false);
    window.dispatchEvent(new Event('gymsync_bio_updated'));
    
    // Auto generate mock upcoming schedule after bio fill
    setUpcoming([
      { id: 'u1', name: 'Barbell Squats', date: 'Tomorrow, 8:00 AM' },
      { id: 'u2', name: 'Romanian Deadlifts', date: 'Tomorrow, 8:30 AM' }
    ]);
  };

  const handlePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImageSrc(reader.result);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input so same file can be selected again
    if (e.target) e.target.value = null;
  };

  const saveProfilePic = async (image) => {
    localStorage.setItem(`gymsync_${userKey}_pic`, image);
    const response = await fetch('/api/users/profile-pic', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({ profilePic: image })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to save profile picture.');
  };

  const onCropComplete = async (croppedImage) => {
    setProfilePic(croppedImage);
    setRawImageSrc(null);
    try {
      await saveProfilePic(croppedImage);
      toast.success('Profile picture updated.');
    } catch (error) {
      toast.error(error.message);
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
      if (!res.ok) {
        throw new Error(data.message || 'Password update failed');
      }

      setPasswordMessage('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Unable to update password.');
    }
  };

  // Date formatting helpers
  const todayDate = new Date().toDateString();
  const todayHistory = history.filter(h => new Date(h.date).toDateString() === todayDate);
  const pastHistory = history.filter(h => new Date(h.date).toDateString() !== todayDate);

  if (isAdminUser) {
    return (
      <div className="profile-page">
        <div className="profile-cover"></div>
        <div className="container">
          <div className="profile-header glass-panel" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', alignItems: 'center' }}>
            <div className="profile-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '120px', height: '120px', borderRadius: '50%', background: 'var(--card-bg)' }}>
              {profilePic ? (
                <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '3rem', color: 'var(--text-primary)' }}>{userName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="profile-info">
              <h1>{userName}</h1>
              <p className="bio-tagline" style={{ color: 'var(--text-secondary)' }}>{userRole}</p>
              <p style={{ marginTop: '12px', maxWidth: '600px', color: 'var(--text-secondary)' }}>
                Admin profile settings are simplified to security actions only. Update your password or delete your account from here.
              </p>
            </div>
          </div>

          <div className="glass-panel section-panel" style={{ marginTop: '24px', maxWidth: '700px', width: '100%' }}>
            <h3 className="section-title"><Lock size={20} /> Password Settings</h3>
            <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
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
                  placeholder="Enter new password"
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

          <div className="glass-panel section-panel" style={{ marginTop: '24px', maxWidth: '700px', width: '100%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}><Trash2 size={20} /> Delete Account</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Permanently remove your admin account and all local session data. This action cannot be undone.
                </p>
              </div>
              <button
                className="btn"
                style={{ background: '#ef4444', color: 'var(--text-primary)', minWidth: '180px' }}
                onClick={async () => {
                  if (window.confirm('Are you ABSOLUTELY sure you want to permanently delete your account? This cannot be undone!')) {
                    try {
                      const response = await fetch('/api/users/me', {
                        method: 'DELETE',
                        headers: {
                          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
                        }
                      });
                      if (!response.ok) throw new Error('Unable to delete account.');
                    } catch (err) {
                      toast.error(err.message || 'Unable to delete account.');
                      return;
                    }
                    localStorage.removeItem('userInfo');
                    localStorage.removeItem('gymsync_token');
                    localStorage.removeItem('gymsync_role');
                    localStorage.removeItem('gymsync_user_name');
                    window.location.href = '/';
                  }
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="profile-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="profile-cover" style={{ background: 'var(--card-bg)' }}></div>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', marginTop: '-60px' }}>
          <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: 'var(--card-border)', animation: 'pulseBlue 2s infinite' }} />
          <div style={{ width: '250px', height: '40px', background: 'var(--card-border)', borderRadius: '8px', animation: 'pulseBlue 2s infinite' }} />
          <div style={{ width: '100%', maxWidth: '800px', height: '400px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', animation: 'pulseBlue 2s infinite', marginTop: '20px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Cover & Header */}
      <div className="profile-cover"></div>
      <div className="container">
        <div className="profile-header glass-panel">
          <div 
            className="profile-avatar avatar-clickable" 
            style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            title="Change Profile Picture"
          >
            {profilePic ? (
              <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
            <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', borderRadius: '50%' }}>
              <Camera color="white" size={28} />
            </div>
          </div>
          <input type="file" ref={fileInputRef} accept="image/*" style={{display: 'none'}} onChange={handlePicUpload} />
          <div className="profile-info">
            <h1>{userName}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <p className="bio-tagline" style={{ margin: 0 }}>{bio.location ? <><MapPin size={16}/> {bio.location}</> : 'Fitness Enthusiast'}</p>
              {userData?.isGoogleApproved || userData?.isEmailVerified ? (
                <span className="category-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
                  ✅ Gmail Verified
                </span>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="category-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
                    ⚠️ Gmail Verification Pending
                  </span>
                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ padding: '3px 10px', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981', borderRadius: '12px', cursor: 'pointer' }}
                    onClick={() => {
                      setVerifyEmailInput(userData?.email || '');
                      setIsVerifyModalOpen(true);
                    }}
                  >
                    Verify Email Now
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="profile-stats">
            <div className="stat-badge pulse-blue">
              <Activity size={20} />
              <span>{stats.points} Pts</span>
            </div>
            <div className="stat-badge pulse-orange">
              <Flame size={20} />
              <span>{stats.streak} Days</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="profile-tabs glass-panel">
          {isTrainee && <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Workout History</button>}
          <button className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Your Timeline</button>
          {isTrainee && <button className={`tab-btn ${activeTab === 'bio' ? 'active' : ''}`} onClick={() => setActiveTab('bio')}>Health Bio</button>}
          {userRole === 'GymOwner' && <button className={`tab-btn ${activeTab === 'gig' ? 'active' : ''}`} onClick={() => setActiveTab('gig')}>Your Gym Gig</button>}
          <button className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => setActiveTab('privacy')}>Privacy & Data</button>
        </div>

        <div className="profile-content">
          
          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="history-grid">
              
              {/* Upcoming / AI Schedule */}
              <div className="glass-panel section-panel">
                <h3 className="section-title"><Calendar size={20}/> Upcoming AI Schedule</h3>
                {upcoming.length > 0 ? (
                  upcoming.map(up => (
                    <div key={up.id} className="history-item upcoming">
                      <Clock size={16} color="var(--primary-accent)"/>
                      <div style={{flex: 1}}>
                        <h4>{up.name}</h4>
                        <span className="time">{up.date}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-text">Complete your Bio Data to generate your AI Schedule.</p>
                )}
              </div>

              {/* Today's Exercises */}
              <div className="glass-panel section-panel">
                <h3 className="section-title"><CheckCircle size={20} color="#10b981"/> Today's Exercises</h3>
                {todayHistory.length > 0 ? (
                  todayHistory.map((h, i) => (
                    <div key={i} className="history-item completed">
                      <div>
                        <h4>{h.name}</h4>
                        <span className="time">+{h.pointsEarned} Points • {h.trackedViaAI ? 'AI Tracked' : 'Manual'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-text">No exercises completed today. Head to the Workout Hub!</p>
                )}
              </div>

              {/* Past History */}
              <div className="glass-panel section-panel" style={{gridColumn: '1/-1'}}>
                <h3 className="section-title">Past Workouts</h3>
                <div className="past-history-list">
                  {pastHistory.map((h, i) => (
                    <div key={i} className="history-item">
                      <div>
                        <h4>{h.name}</h4>
                        <span className="time">{new Date(h.date).toLocaleDateString()} • +{h.pointsEarned} Pts</span>
                      </div>
                    </div>
                  ))}
                  {pastHistory.length === 0 && <p className="empty-text">No past workouts found.</p>}
                </div>
              </div>
            </div>
          )}

          {/* TIMELINE TAB (Facebook Style) */}
          {activeTab === 'posts' && (
            <div className="timeline-grid">
              {myPosts.length > 0 ? (
                myPosts.map(post => (
                  <div key={post._id} className="glass-panel post-card">
                    <div className="post-header">
                      <div className="avatar" style={{ overflow: 'hidden' }}>
                         {profilePic ? <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : post.authorName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h4>{post.authorName || post.author?.name}</h4>
                        <span className="time">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <p className="post-content">{post.content}</p>
                    {post.mediaUrl && (
                      <img src={`${post.mediaUrl}`} alt="Post" style={{ width: '100%', borderRadius: '12px', marginTop: '10px' }} />
                    )}
                    <div className="post-stats" style={{ display: 'flex', gap: '15px', marginTop: '15px', color: 'var(--text-secondary)' }}>
                      <span>{post.likes?.length || 0} Likes</span>
                      <span>{post.comments?.length || 0} Comments</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-panel section-panel">
                  <p className="empty-text">You haven't posted anything yet. Share your journey on the Home feed!</p>
                </div>
              )}
            </div>
          )}

          {/* BIO TAB */}
          {activeTab === 'bio' && (
            <div className="glass-panel section-panel bio-panel">
              <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h3 className="section-title"><Target size={20}/> Bio</h3>
                <button 
                  className="btn btn-outline btn-sm" 
                  onClick={() => {
                     localStorage.setItem('gymsync_onboarding_skip_date', ''); 
                     window.dispatchEvent(new Event('open-onboarding'));
                  }}
                >
                  Edit Bio
                </button>
              </div>

              {!bio.mainGoalArea ? (
                <div style={{textAlign: 'center', padding: '30px 0'}}>
                  <p className="empty-text">Your comprehensive biological profile is incomplete.</p>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                       localStorage.setItem('gymsync_onboarding_skip_date', ''); 
                       window.dispatchEvent(new Event('open-onboarding'));
                    }}
                    style={{marginTop: '15px'}}
                  >
                    Start Assessment Now
                  </button>
                </div>
              ) : (
                <div className="bio-summary-grid">
                  {/* Visual Body Progress Card */}
                  <div className="bio-stat-card full" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={{ alignSelf: 'flex-start' }}>Saved Body Baseline</h4>
                    <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--card-border)', marginTop: '10px' }}>
                      <svg viewBox="0 0 100 200" style={{ height: '200px' }}>
                        <circle cx="50" cy="20" r="12" fill="var(--primary-accent)" />
                        <ellipse cx="50" cy="50" rx={18 + ((bio.bodyFatVolume || 30)/20)} ry="10" fill="var(--primary-accent)" />
                        <path d={`M ${32 - ((bio.bodyFatVolume || 30)/20)} 50 Q ${25 - ((bio.bodyFatVolume || 30)/4)} 100 ${35 - ((bio.bodyFatVolume || 30)/12)} 130 L ${65 + ((bio.bodyFatVolume || 30)/12)} 130 Q ${75 + ((bio.bodyFatVolume || 30)/4)} 100 ${68 + ((bio.bodyFatVolume || 30)/20)} 50 Z`} fill="var(--primary-accent)" />
                        <path d={`M ${35 - ((bio.bodyFatVolume || 30)/12)} 130 L 42 190 L 50 140 L 58 190 L ${65 + ((bio.bodyFatVolume || 30)/12)} 130 Z`} fill="var(--primary-accent)" />
                      </svg>
                    </div>
                  </div>

                  <div className="bio-stat-card full">
                    <h4>Primary Path</h4>
                    <p>{bio.mainGoalArea || 'Not Set'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Specific Goals</h4>
                    <p>{bio.goals?.length > 0 ? bio.goals.join(', ') : 'Not Set'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Muscle Focus</h4>
                    <p>{bio.targetMuscles?.length > 0 ? bio.targetMuscles.join(', ') : 'Full Body'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Current Weight</h4>
                    <p>{bio.weight} {bio.units === 'metric' ? 'kg' : 'lbs'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Target Weight</h4>
                    <p>{bio.targetWeight} {bio.units === 'metric' ? 'kg' : 'lbs'}</p>
                  </div>
                  <div className="bio-stat-card full">
                    <h4>Medical Conditions</h4>
                    <p>{bio.medicalConditions?.length > 0 ? bio.medicalConditions.join(', ') : 'None Reported'}</p>
                  </div>
                  <div className="bio-stat-card full">
                    <h4>Joint & Muscle Issues</h4>
                    <p>{bio.injuries?.length > 0 ? bio.injuries.join(', ') : 'None Reported'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PRIVACY & DATA TAB */}
          {activeTab === 'privacy' && (
            <div className="glass-panel section-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h3 className="section-title"><Shield size={20} color="var(--primary-accent)"/> Privacy & GDPR Controls</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Manage your data privacy and control what others can see on your public profile.</p>

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

              <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><DownloadCloud size={16}/> Download My Data</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Export a JSON copy of all your personal data (GDPR Right to Access).</p>
                  </div>
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      const data = {
                        bio, stats, history, myPosts,
                        profilePic: !!profilePic
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `GymSync_Data_${userName}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export Data
                  </button>
                </div>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}><Trash2 size={16}/> Delete Account</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>Permanently delete your account and all associated data.</p>
                  </div>
                  <button 
                    className="btn"
                    style={{ background: '#ef4444', color: 'var(--text-primary)' }}
                    onClick={async () => {
                      if(window.confirm('Are you ABSOLUTELY sure you want to permanently delete your account? This cannot be undone!')) {
                        try {
                          const response = await fetch('/api/users/me', {
                            method: 'DELETE',
                            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
                          });
                          if (!response.ok) throw new Error('Unable to delete account.');
                          localStorage.removeItem('userInfo');
                          localStorage.removeItem('gymsync_token');
                          localStorage.removeItem('gymsync_role');
                          localStorage.removeItem('gymsync_user_name');
                          window.location.href = '/';
                        } catch (err) {
                          toast.error(err.message || 'Failed to delete account');
                        }
                      }
                    }}
                  >
                    Delete Account
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* GYM GIG TAB */}
          {activeTab === 'gig' && (
            <div className="glass-panel section-panel">
              <h3 className="section-title"><Building size={20}/> Your Gym Gig</h3>
              {myGymGig ? (
                <div className="gym-gig-display" style={{ marginTop: '20px' }}>
                  {myGymGig.equipmentImages?.[0] && (
                    <div style={{ width: '100%', height: '200px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
                      <img src={myGymGig.equipmentImages[0]} alt="Gym Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <h2 style={{ marginBottom: '10px' }}>{myGymGig.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>{myGymGig.location}</p>
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <div><strong>Monthly Fee:</strong> ${myGymGig.monthlyFee}</div>
                    <div><strong>Admission Fee:</strong> ${myGymGig.admissionFee || 0}</div>
                  </div>
                  {myGymGig.description && (
                    <div style={{ background: 'var(--card-bg)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                      <h4 style={{ marginBottom: '10px', color: 'var(--primary-accent)' }}>Gym Description (Post Info)</h4>
                      <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.6' }}>{myGymGig.description}</p>
                    </div>
                  )}
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--card-border)' }}>
                    <a href="/admin" className="btn btn-outline" style={{ display: 'inline-block' }}>
                      Manage in Dashboard
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <p className="empty-text">You haven't set up your Gym Gig yet.</p>
                  <a href="/admin" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '15px' }}>
                    Set Up Facility
                  </a>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      {rawImageSrc && (
        <ImageCropper 
          imageSrc={rawImageSrc} 
          onCropComplete={onCropComplete} 
          onCancel={() => setRawImageSrc(null)} 
        />
      )}

      <Modal isOpen={isVerifyModalOpen} onClose={() => { setIsVerifyModalOpen(false); setOtpStep(1); setOtpInput(''); }} title="Authenticate & Verify Gmail">
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
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', background: '#3b82f6', borderColor: '#3b82f6', marginTop: '10px' }} disabled={isSendingOtp}>
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
              <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '12px', background: '#10b981', borderColor: '#10b981' }} disabled={isVerifyingOtp}>
                {isVerifyingOtp ? 'Authenticating...' : 'Authenticate & Approve'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Profile;
