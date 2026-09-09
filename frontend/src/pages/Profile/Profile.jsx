import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Flame, Target, MapPin, Calendar, CheckCircle, Clock, 
  DownloadCloud, Trash2, Shield, Lock, Camera, Building, 
  Image as ImageIcon, Send, User, Settings, Dumbbell, BookOpen, Utensils, Award 
} from 'lucide-react';
import ImageCropper from '../../components/layout/ImageCropper';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { toast } from 'react-toastify';
import { can } from '../../config/permissions';
import './Profile.css';
import WorkoutCalendar from '../../components/common/WorkoutCalendar';
import PostList from '../../features/social/components/PostList';
import UserAvatar from '../../components/common/UserAvatar';
import { postService } from '../../services/postService';

const Profile = () => {
  const userRole = localStorage.getItem('gymsync_role') || 'User';
  const isTrainee = userRole === 'User' || userRole === 'Guest';
  const [activeTab, setActiveTab] = useState('posts');
  const [activeSettingSection, setActiveSettingSection] = useState('general');
  const [isEditingBio, setIsEditingBio] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({ points: 0, streak: 0 });
  const [instructorStats, setInstructorStats] = useState({
    programs: 0,
    diets: 0,
    articles: 0,
    tasksCompleted: 0
  });
  const [history, setHistory] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [myGymGig, setMyGymGig] = useState(null);
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const userKey = userName.replace(/\s+/g, '_'); // normalize for local storage key
  const [profilePic, setProfilePic] = useState(localStorage.getItem(`gymsync_${userKey}_pic`) || '');
  const [userData, setUserData] = useState(null);
  const [rawImageSrc, setRawImageSrc] = useState(null);

  // New Post State
  const [newPostText, setNewPostText] = useState('');
  const [selectedPostFile, setSelectedPostFile] = useState(null);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const postFileInputRef = useRef(null);

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

  const [aiPlan, setAiPlan] = useState(null);
  const [workoutProgress, setWorkoutProgress] = useState({ completedDays: [], completedExercises: [] });

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

    let rawHistory = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(`gymsync_${userKey}_history`) || '[]');
      rawHistory = Array.isArray(parsed) ? parsed : [];
    } catch (e) { rawHistory = []; }
    setHistory([...rawHistory].reverse()); // Newest first

    if (userRole === 'FitnessInstructor') {
      const token = localStorage.getItem('gymsync_token') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      Promise.all([
        fetch('/api/plans/premade', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/articles', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/instructor-requests', { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
      ]).then(([plans, articles, requests]) => {
        const myPrograms = (plans || []).filter(p => (p.type === 'workout' || !p.type));
        const myDiets = (plans || []).filter(p => p.type === 'diet');
        const myArticles = (articles || []);
        const myCompletedTasks = (requests || []).filter(r => r.status === 'Completed');

        setInstructorStats({
          programs: myPrograms.length,
          diets: myDiets.length,
          articles: myArticles.length,
          tasksCompleted: myCompletedTasks.length
        });
      }).catch(err => console.error('Error fetching instructor stats:', err));
    }

    // Function to load and sync bio data dynamically
    const loadBioData = () => {
      const bioFilled = localStorage.getItem(`gymsync_${userKey}_bio_filled`) === 'true' || localStorage.getItem('gymsync_bio_filled') === 'true';
      if (bioFilled) {
        const storedBio = localStorage.getItem(`gymsync_${userKey}_bio_data`) || localStorage.getItem(`gymsync_${userKey}_bio`);
        if (storedBio) {
          try {
            setBio(JSON.parse(storedBio));
          } catch (e) {
            console.error("Error parsing bio data", e);
          }
        }
      }

      const storedPlan = localStorage.getItem(`gymsync_${userKey}_ai_plan`);
      if (storedPlan) {
        try {
          const parsedPlan = JSON.parse(storedPlan);
          setAiPlan(parsedPlan);
          if (parsedPlan && parsedPlan.interactive_calendar) {
            const nextWorkout = parsedPlan.interactive_calendar.find(d => d.isWorkoutDay);
            if (nextWorkout) {
              setUpcoming([
                { id: 'u1', name: `Day ${nextWorkout.dayNumber}: ${nextWorkout.focusArea || 'Workout Session'}`, date: 'Scheduled Workout' }
              ]);
            }
          }
        } catch (e) {}
      }

      const storedProgress = localStorage.getItem(`gymsync_${userKey}_workout_progress`);
      if (storedProgress) {
        try {
          setWorkoutProgress(JSON.parse(storedProgress));
        } catch (e) {}
      }

      // Fetch authoritative workout progress from server
      if (userName !== 'Guest User') {
        fetch('/api/users/workout-progress', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
          }
        })
          .then(res => res.ok ? res.json() : null)
          .then(srvProg => {
            if (srvProg && srvProg.completedDays) {
              setWorkoutProgress(srvProg);
              localStorage.setItem(`gymsync_${userKey}_workout_progress`, JSON.stringify(srvProg));
            }
          })
          .catch(err => console.warn("Error fetching workout progress from server:", err));
      }
    };

    loadBioData();
    window.addEventListener('gymsync_bio_updated', loadBioData);

    const fetches = [];

    if (userName !== 'Guest User') {
      fetches.push(
        fetch(`/api/users/${userName}`)
          .then(res => res.ok ? res.json() : null)
          .then(user => {
            if (user && !user.message && user._id) {
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
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            setMyPosts(data.filter(p => p && (p.authorName === userName || p.author?.name === userName)));
          } else {
            setMyPosts([]);
          }
        })
        .catch(err => {
          console.error(err);
          setMyPosts([]);
        })
    );

    const role = localStorage.getItem('gymsync_role');
    if (role === 'GymOwner') {
      fetches.push(
        fetch(`/api/gym-owner/dashboard/${userName}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}`
          }
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.gym && data.gym._id !== 'gym_demo_id') {
            setMyGymGig(data.gym);
          }
        })
        .catch(err => console.error('Error fetching gym gig', err))
      );
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
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Post Actions Handlers
  const handleCreateProfilePost = async (e) => {
    if (e) e.preventDefault();
    if (!newPostText.trim() && !selectedPostFile) {
      toast.warning('Please write something or attach a photo.');
      return;
    }
    setIsPublishingPost(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostText);
      formData.append('authorName', userName);
      if (selectedPostFile) {
        formData.append('media', selectedPostFile);
      }
      const created = await postService.createPost(formData);
      setMyPosts(prev => [created, ...prev]);
      setNewPostText('');
      setSelectedPostFile(null);
      if (postFileInputRef.current) postFileInputRef.current.value = null;
      toast.success('Post published to your timeline!');
    } catch (err) {
      toast.error(err.message || 'Failed to create post');
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

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const response = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Unable to delete account.');
      }
      localStorage.removeItem('userInfo');
      localStorage.removeItem('gymsync_token');
      localStorage.removeItem('gymsync_role');
      localStorage.removeItem('gymsync_user_name');
      setShowDeleteAccountModal(false);
      window.location.href = '/';
    } catch (err) {
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
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
  const safeHistory = Array.isArray(history) ? history : [];
  const todayHistory = safeHistory.filter(h => h && h.date && new Date(h.date).toDateString() === todayDate);
  const photoPosts = myPosts.filter(p => p.mediaUrl).slice(0, 6);

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
            style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', padding: 0 }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            title="Change Profile Picture"
          >
            <UserAvatar 
              src={profilePic} 
              name={userName} 
              size={120} 
              style={{ width: '100%', height: '100%', borderRadius: '50%', boxShadow: 'none' }} 
            />
            <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', borderRadius: '50%' }}>
              <Camera color="white" size={28} />
            </div>
          </div>
          <input type="file" ref={fileInputRef} accept="image/*" style={{display: 'none'}} onChange={handlePicUpload} />
          <div className="profile-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0 }}>{userName}</h1>
              <span className="category-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                {userRole}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
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
            {isTrainee ? (
              <>
                <div className="stat-badge pulse-blue">
                  <Activity size={20} />
                  <span>{stats.points} Pts</span>
                </div>
                <div className="stat-badge pulse-orange">
                  <Flame size={20} />
                  <span>{stats.streak} Days</span>
                </div>
              </>
            ) : userRole === 'FitnessInstructor' ? (
              <>
                <div className="stat-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid #3b82f6' }}>
                  <Award size={18} />
                  <span>Certified Instructor</span>
                </div>
                <div className="stat-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981' }}>
                  <Dumbbell size={18} />
                  <span>{instructorStats.programs} Programs</span>
                </div>
                <div className="stat-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid #f59e0b' }}>
                  <BookOpen size={18} />
                  <span>{instructorStats.articles} Guides</span>
                </div>
              </>
            ) : (
              <div className="stat-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid #3b82f6' }}>
                <Shield size={18} />
                <span>{userRole}</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="profile-tabs glass-panel">
          <button className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>
            Timeline
          </button>
          {isTrainee && (
            <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              Workout History
            </button>
          )}
          {isTrainee && (
            <button className={`tab-btn ${activeTab === 'bio' ? 'active' : ''}`} onClick={() => setActiveTab('bio')}>
              Health Bio
            </button>
          )}
          {userRole === 'GymOwner' && (
            <button className={`tab-btn ${activeTab === 'gig' ? 'active' : ''}`} onClick={() => setActiveTab('gig')}>
              Your Gym Gig
            </button>
          )}
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            Settings & Privacy
          </button>
        </div>

        <div className="profile-content">
          
          {/* TIMELINE TAB (Facebook-Style Two Column Layout) */}
          {activeTab === 'posts' && (
            <div className="fb-profile-layout">
              {/* Left Column: Intro, Stats, Photos */}
              <div className="fb-profile-sidebar">
                <div className="glass-panel fb-intro-card">
                  <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Intro</h3>
                  <p className="fb-bio-text">
                    {bio.fitnessGoals || (userRole === 'GymTrainer' ? 'Certified Gym Trainer & Fitness Coach' : userRole === 'GymOwner' ? 'Gym Owner & Facility Partner' : isAdminUser ? 'GymSync Platform Administrator' : 'GymSync Community Member')}
                  </p>
                  <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
                    {bio.location && (
                      <div className="fb-intro-item"><MapPin size={16} color="var(--primary-accent)" /> Lives in <strong>{bio.location}</strong></div>
                    )}
                    <div className="fb-intro-item"><User size={16} color="var(--primary-accent)" /> Role: <strong>{userRole}</strong></div>
                    {bio.mainGoalArea && (
                      <div className="fb-intro-item"><Target size={16} color="#10b981" /> Path: <strong>{bio.mainGoalArea}</strong></div>
                    )}
                    {bio.equipmentAccess && (
                      <div className="fb-intro-item"><Building size={16} color="#f59e0b" /> Access: <strong>{bio.equipmentAccess}</strong></div>
                    )}
                    {!hideHealthData && bio.height && (
                      <div className="fb-intro-item">📏 Height: <strong>{bio.height} {bio.units === 'imperial' ? 'in' : 'cm'}</strong></div>
                    )}
                    {!hideHealthData && bio.weight && (
                      <div className="fb-intro-item">⚖️ Weight: <strong>{bio.weight} {bio.units === 'imperial' ? 'lbs' : 'kg'}</strong></div>
                    )}
                  </div>
                  {isTrainee && (
                    <button 
                      className="btn btn-outline btn-sm" 
                      style={{ width: '100%', marginTop: '14px' }}
                      onClick={() => {
                        localStorage.setItem('gymsync_onboarding_skip_date', ''); 
                        window.dispatchEvent(new Event('open-onboarding'));
                      }}
                    >
                      Edit Bio / Assessment
                    </button>
                  )}
                </div>

                {/* Badges / Stats */}
                {isTrainee && (
                  <div className="glass-panel fb-intro-card">
                    <h4 className="section-title" style={{ fontSize: '1rem', marginBottom: '12px' }}>Fitness Stats</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--primary-accent)', fontWeight: 'bold', fontSize: '1.2rem' }}>{stats.points}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Points</div>
                      </div>
                      <div style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '1.2rem' }}>{stats.streak}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Day Streak</div>
                      </div>
                    </div>
                  </div>
                )}

                {userRole === 'FitnessInstructor' && (
                  <div className="glass-panel fb-intro-card">
                    <h4 className="section-title" style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Award size={16} color="var(--primary-accent)" /> Instructor Portfolio
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--primary-accent)', fontWeight: 'bold', fontSize: '1.2rem' }}>{instructorStats.programs}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Programs Authored</div>
                      </div>
                      <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>{instructorStats.diets}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Diet Templates</div>
                      </div>
                      <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.2rem' }}>{instructorStats.articles}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Published Guides</div>
                      </div>
                      <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '1.2rem' }}>{instructorStats.tasksCompleted}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tasks Completed</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Photos Preview */}
                {photoPosts.length > 0 && (
                  <div className="glass-panel fb-intro-card">
                    <h4 className="section-title" style={{ fontSize: '1rem', marginBottom: '12px' }}>Photos</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {photoPosts.map((p, idx) => (
                        <img key={p._id || idx} src={p.mediaUrl} alt="Timeline photo" style={{ width: '100%', height: '75px', objectFit: 'cover', borderRadius: '8px' }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Create Post Card + Interactive PostList */}
              <div className="fb-profile-feed">
                {/* Create Post Card */}
                <div className="glass-panel fb-create-post-card">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="fb-feed-avatar" style={{ overflow: 'hidden' }}>
                      <UserAvatar src={profilePic} name={userName} size={40} />
                    </div>
                    <input 
                      type="text" 
                      className="fb-post-input"
                      placeholder={`What's on your fitness mind, ${userName.split(' ')[0]}?`}
                      value={newPostText}
                      onChange={e => setNewPostText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleCreateProfilePost(e); }}
                    />
                  </div>

                  {selectedPostFile && (
                    <div className="fb-media-preview">
                      <span>Attached: {selectedPostFile.name}</span>
                      <button type="button" onClick={() => { setSelectedPostFile(null); if (postFileInputRef.current) postFileInputRef.current.value = null; }}>Remove</button>
                    </div>
                  )}

                  <div className="fb-post-actions-bar">
                    <label className="fb-upload-btn">
                      <ImageIcon size={18} color="#10b981" />
                      <span>Photo / Video</span>
                      <input 
                        type="file" 
                        ref={postFileInputRef} 
                        accept="image/*,video/*" 
                        style={{ display: 'none' }} 
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedPostFile(e.target.files[0]);
                          }
                        }} 
                      />
                    </label>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={handleCreateProfilePost}
                      disabled={isPublishingPost}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Send size={14} />
                      {isPublishingPost ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>

                {/* Facebook PostList with interactive like, comment, and replies */}
                <PostList 
                  posts={myPosts}
                  currentUserName={userName}
                  userRole={userRole}
                  onLike={handleLikePost}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  onAddReply={handleAddReply}
                  onDeleteReply={handleDeleteReply}
                />
              </div>
            </div>
          )}

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

              {/* Past Workouts Calendar */}
              <div className="glass-panel section-panel" style={{gridColumn: '1/-1'}}>
                <h3 className="section-title"><Calendar size={20}/> Past Workouts</h3>
                <WorkoutCalendar history={safeHistory} aiPlan={aiPlan} workoutProgress={workoutProgress} />
              </div>
            </div>
          )}

          {/* BIO TAB */}
          {activeTab === 'bio' && (
            <div className="glass-panel section-panel bio-panel">
              <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h3 className="section-title"><Target size={20}/> Health Bio</h3>
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
                  <div className="bio-stat-card full">
                    <h4>Primary Fitness Path</h4>
                    <p>{bio.mainGoalArea || 'Not Set'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Specific Goals</h4>
                    <p>{bio.goals?.length > 0 ? bio.goals.join(', ') : 'Not Set'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Plan Duration</h4>
                    <p style={{ color: 'var(--primary-accent)', fontWeight: 'bold' }}>{bio.planDuration || '1 Month'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Weekly Frequency</h4>
                    <p>{bio.trainingDaysPerWeek || 3} Days / Week</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Available Equipment</h4>
                    <p>{bio.equipmentAccess || 'Full Gym'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Stamina Push-up Baseline</h4>
                    <p style={{ color: '#10b981', fontWeight: 'bold' }}>{bio.pushupBaseline || 10} Reps</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Target Muscle Focus</h4>
                    <p>{bio.targetMuscles?.length > 0 ? bio.targetMuscles.join(', ') : 'Full Body'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Gender</h4>
                    <p>{bio.gender || 'Not Set'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Current Height</h4>
                    <p>{bio.height ? `${bio.height} ${bio.units === 'imperial' ? 'in' : 'cm'}` : 'Not Set'}</p>
                  </div>
                  <div className="bio-stat-card">
                    <h4>Current Weight</h4>
                    <p>{bio.weight ? `${bio.weight} ${bio.units === 'imperial' ? 'lbs' : 'kg'}` : 'Not Set'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS & PRIVACY TAB (Consolidated Facebook Hub) */}
          {activeTab === 'settings' && (
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
                  <Lock size={18} /> Security & Password
                </button>
                <button 
                  className={`fb-settings-nav-btn ${activeSettingSection === 'privacy' ? 'active' : ''}`}
                  onClick={() => setActiveSettingSection('privacy')}
                >
                  <Shield size={18} /> Privacy & GDPR
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
                    <h3 className="section-title" style={{ marginBottom: '16px' }}><Shield size={20} color="var(--primary-accent)" /> Privacy & GDPR Controls</h3>
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

      <ConfirmDialog
        isOpen={showDeleteAccountModal}
        title="Delete Account"
        message="Are you ABSOLUTELY sure you want to permanently delete your account? This action cannot be undone and will permanently remove all your data."
        confirmText="Delete Account"
        confirmVariant="danger"
        typedConfirmation="DELETE"
        loading={isDeletingAccount}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteAccountModal(false)}
      />
    </div>
  );
};

export default Profile;
