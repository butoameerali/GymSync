import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import ImageCropper from '../../components/layout/ImageCropper';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { toast } from 'react-toastify';
import './Profile.css';
import { postService } from '../../services/postService';

import ProfileHeader from './ProfileHeader';
import ProfileTimelineTab from './ProfileTimelineTab';
import ProfileHistoryTab from './ProfileHistoryTab';
import ProfileBioTab from './ProfileBioTab';
import ProfileSettingsPanel from './ProfileSettingsPanel';
import ProfileGigTab from './ProfileGigTab';
import ProfileVerifyEmailModal from './ProfileVerifyEmailModal';
import TodaysEnergyCard from './TodaysEnergyCard';
import TrainerProfile from '../GymTrainer/TrainerProfile';
import GymOwnerProfileRedirect from './GymOwnerProfileRedirect';
import StoreManagerProfile from './StoreManagerProfile';
import FitnessInstructorProfile from './FitnessInstructorProfile';
import AdminProfile from './AdminProfile';

const Profile = () => {
  const { userName: routeUserName } = useParams();
  const loggedInUserName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const loggedInRole = localStorage.getItem('gymsync_role') || 'User';

  const isOwnProfile = !routeUserName || routeUserName.toLowerCase() === loggedInUserName.toLowerCase();
  const activeUserName = isOwnProfile ? loggedInUserName : routeUserName;

  // Dedicated role redirects apply ONLY when viewing own profile
  if (isOwnProfile) {
    const normalizedRole = loggedInRole.toLowerCase().replace(/[_\s]/g, '');
    if (normalizedRole === 'gymtrainer') {
      return <TrainerProfile />;
    }
    if (normalizedRole === 'gymowner' || normalizedRole === 'gym_owner') {
      return <GymOwnerProfileRedirect />;
    }
    if (normalizedRole === 'storemanager') {
      return <StoreManagerProfile />;
    }
    if (normalizedRole === 'fitnessinstructor') {
      return <FitnessInstructorProfile />;
    }
    if (normalizedRole === 'admin' || normalizedRole === 'superadmin' || normalizedRole === 'complaintmoderator') {
      return <AdminProfile />;
    }
  }

  const [userData, setUserData] = useState(null);
  const profileRole = isOwnProfile ? loggedInRole : (userData?.role || 'User');
  const isTrainee = profileRole === 'User' || profileRole === 'Guest';

  const [activeTab, setActiveTab] = useState('posts');
  const [activeSettingSection, setActiveSettingSection] = useState('general');
  const [mobileSlide, setMobileSlide] = useState(0); // 0: Athlete Card, 1: Activity & Feed
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchEndXRef = useRef(0);
  const touchEndYRef = useRef(0);

  useEffect(() => {
    document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleMobileTouchStart = (e) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchStartYRef.current = e.targetTouches[0].clientY;
    touchEndXRef.current = e.targetTouches[0].clientX;
    touchEndYRef.current = e.targetTouches[0].clientY;
  };
  const handleMobileTouchMove = (e) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
    touchEndYRef.current = e.targetTouches[0].clientY;
  };
  const handleMobileTouchEnd = () => {
    const deltaX = touchStartXRef.current - touchEndXRef.current;
    const deltaY = touchStartYRef.current - touchEndYRef.current;
    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
      if (deltaX > 0 && mobileSlide === 0) {
        setMobileSlide(1);
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else if (deltaX < 0 && mobileSlide === 1) {
        setMobileSlide(0);
      }
    }
  };

  // Stats
  const [stats, setStats] = useState({ points: 0, streak: 0 });
  const [instructorStats, setInstructorStats] = useState({
    programs: 0, diets: 0, articles: 0, tasksCompleted: 0
  });
  const [history, setHistory] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [myGymGig, setMyGymGig] = useState(null);

  const userKey = activeUserName.replace(/\s+/g, '_');
  const [profilePic, setProfilePic] = useState(
    isOwnProfile ? (localStorage.getItem(`gymsync_${userKey}_pic`) || '') : ''
  );
  const [rawImageSrc, setRawImageSrc] = useState(null);

  // Follow State (when viewing another user's profile)
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);

  // New Post State
  const [newPostText, setNewPostText] = useState('');
  const [selectedPostFile, setSelectedPostFile] = useState(null);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const postFileInputRef = useRef(null);

  // Bio Data
  const [bio, setBio] = useState({
    height: '', weight: '', bodyType: 'healthy', fitnessGoals: '', location: ''
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

  // Settings State
  const [hideHealthData, setHideHealthData] = useState(() => localStorage.getItem('gymsync_privacy_hideHealth') === 'true');
  const isAdminUser = ['SuperAdmin', 'Admin', 'ComplaintModerator'].includes(profileRole);
  const authToken = localStorage.getItem('gymsync_token');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeactivateAccountModal, setShowDeactivateAccountModal] = useState(false);
  const [isDeactivatingAccount, setIsDeactivatingAccount] = useState(false);

  // ─── Handlers ────────────────────────────────────────────────────────────────

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
      const response = await fetch('/api/users/me', { method: 'DELETE', headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to delete account.');
      ['userInfo', 'gymsync_token', 'gymsync_role', 'gymsync_user_name'].forEach(k => localStorage.removeItem(k));
      setShowDeleteAccountModal(false);
      toast.warning('Your account has been moved to the Recycle Bin. You have 15 days to log in and restore it.');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err) { toast.error(err.message || 'Failed to delete account'); }
    finally { setIsDeletingAccount(false); }
  };

  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    if (!verifyEmailInput.trim()) return;
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/users/send-verification-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken || ''}` },
        body: JSON.stringify({ userName: activeUserName, email: verifyEmailInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      toast.success(data.message || '6-digit OTP sent to your Gmail address. Please check your inbox.');
      setOtpStep(2);
    } catch (err) { toast.error(err.message); }
    finally { setIsSendingOtp(false); }
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    setIsVerifyingOtp(true);
    try {
      const res = await fetch('/api/users/verify-email-otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken || ''}` },
        body: JSON.stringify({ userName: activeUserName, email: verifyEmailInput.trim(), otp: otpInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP Verification failed');
      setUserData(prev => ({ ...(prev || {}), email: verifyEmailInput.trim(), isEmailVerified: true, isGoogleApproved: true }));
      toast.success('✅ Google Gmail authenticated & verified successfully!');
      setIsVerifyModalOpen(false);
      setOtpStep(1);
      setOtpInput('');
    } catch (err) { toast.error(err.message); }
    finally { setIsVerifyingOtp(false); }
  };

  const handleCreateProfilePost = async (e) => {
    if (e) e.preventDefault();
    if (!isOwnProfile) return;
    if (!newPostText.trim() && !selectedPostFile) { toast.warning('Please write something or attach a photo.'); return; }
    setIsPublishingPost(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostText);
      formData.append('authorName', activeUserName);
      if (selectedPostFile) formData.append('media', selectedPostFile);
      const created = await postService.createPost(formData);
      setMyPosts(prev => [created, ...prev]);
      setNewPostText('');
      setSelectedPostFile(null);
      if (postFileInputRef.current) postFileInputRef.current.value = null;
      toast.success('Post published to your timeline!');
    } catch (err) { toast.error(err.message || 'Failed to create post'); }
    finally { setIsPublishingPost(false); }
  };

  const handleLikePost = async (postId) => {
    try {
      const updated = await postService.likePost(postId);
      setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p)));
    } catch (err) { toast.error(err.message || 'Failed to like post'); }
  };

  const handleAddComment = async (postId, text) => {
    try {
      const updated = await postService.addComment(postId, text);
      setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p)));
    } catch (err) { toast.error(err.message || 'Failed to add comment'); }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const updated = await postService.deleteComment(postId, commentId);
      setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p)));
    } catch (err) { toast.error(err.message || 'Failed to delete comment'); }
  };

  const handleAddReply = async (postId, commentId, text) => {
    try {
      const updated = await postService.addReply(postId, commentId, text);
      setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p)));
    } catch (err) { toast.error(err.message || 'Failed to add reply'); }
  };

  const handleDeleteReply = async (postId, commentId, replyId) => {
    try {
      const updated = await postService.deleteReply(postId, commentId, replyId);
      setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p)));
    } catch (err) { toast.error(err.message || 'Failed to delete reply'); }
  };

  const handlePicUpload = (e) => {
    if (!isOwnProfile) return;
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setRawImageSrc(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = async (croppedBlob) => {
    if (!isOwnProfile) return;
    try {
      const formData = new FormData();
      formData.append('profilePic', croppedBlob, 'avatar.jpg');
      formData.append('userName', activeUserName);

      const res = await fetch('/api/users/profile-pic', {
        method: 'PUT',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update avatar');

      const updatedPic = data.profilePic || data.url;
      setProfilePic(updatedPic);
      localStorage.setItem(`gymsync_${userKey}_pic`, updatedPic);
      setRawImageSrc(null);
      toast.success('Profile photo updated successfully!');
      window.dispatchEvent(new Event('gymsync_user_updated'));
    } catch (err) {
      toast.error(err.message || 'Avatar update failed');
    }
  };

  const handleFollowToggle = async () => {
    if (loggedInUserName === 'Guest User' || isFollowPending) {
      if (loggedInUserName === 'Guest User') toast.info('Please log in to follow athletes.');
      return;
    }
    const previousState = isFollowing;
    const newState = !previousState;
    setIsFollowing(newState);
    setIsFollowPending(true);

    setUserData(prev => {
      if (!prev) return prev;
      const followers = prev.followers || [];
      const updatedFollowers = newState
        ? (followers.includes(loggedInUserName) ? followers : [...followers, loggedInUserName])
        : followers.filter(name => name !== loggedInUserName);
      return { ...prev, followers: updatedFollowers };
    });

    try {
      const endpoint = previousState ? '/api/users/unfollow' : '/api/users/follow';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken || ''}`
        },
        body: JSON.stringify({ followerName: loggedInUserName, targetName: activeUserName })
      });
      if (!res.ok) {
        setIsFollowing(previousState);
        toast.error('Action failed. Rolled back follow status.');
      } else {
        toast.success(previousState ? `Unfollowed ${activeUserName}` : `Now following ${activeUserName}!`);
      }
    } catch (err) {
      console.error(err);
      setIsFollowing(previousState);
      toast.error('Network error updating follow status.');
    } finally {
      setIsFollowPending(false);
    }
  };

  const handleOpenMessage = () => {
    if (loggedInUserName === 'Guest User') {
      toast.info('Please log in to message athletes.');
      return;
    }
    window.dispatchEvent(new CustomEvent('open_chat', { detail: { userName: activeUserName } }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage(''); setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError('Please fill in all password fields.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    if (newPassword.length < 6) { setPasswordError('New password must be at least 6 characters long.'); return; }
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password update failed');
      setPasswordMessage('Password updated successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) { setPasswordError(err.message || 'Unable to update password.'); }
  };

  // ─── Data Loading Effect ─────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);

    if (isOwnProfile) {
      const mockPoints = localStorage.getItem(`gymsync_${userKey}_points`) || '0';
      const mockStreak = localStorage.getItem(`gymsync_${userKey}_streak`) || '0';
      setStats({ points: parseInt(mockPoints, 10), streak: parseInt(mockStreak, 10) });

      let rawHistory = [];
      try {
        const parsed = JSON.parse(localStorage.getItem(`gymsync_${userKey}_history`) || '[]');
        rawHistory = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        rawHistory = [];
      }
      setHistory([...rawHistory].reverse());

      const bioFilled = localStorage.getItem(`gymsync_${userKey}_bio_filled`) === 'true' || localStorage.getItem('gymsync_bio_filled') === 'true';
      if (bioFilled) {
        const storedBio = localStorage.getItem(`gymsync_${userKey}_bio_data`) || localStorage.getItem(`gymsync_${userKey}_bio`);
        if (storedBio) {
          try { setBio(JSON.parse(storedBio)); } catch (e) {}
        }
      }

      const storedPlan = localStorage.getItem(`gymsync_${userKey}_ai_plan`);
      if (storedPlan) {
        try {
          const parsedPlan = JSON.parse(storedPlan);
          setAiPlan(parsedPlan);
          if (parsedPlan && parsedPlan.interactive_calendar) {
            const nextWorkout = parsedPlan.interactive_calendar.find(d => d.isWorkoutDay);
            if (nextWorkout) setUpcoming([{ id: 'u1', name: `Day ${nextWorkout.dayNumber}: ${nextWorkout.focusArea || 'Workout Session'}`, date: 'Scheduled Workout' }]);
          }
        } catch (e) {}
      }

      const storedProgress = localStorage.getItem(`gymsync_${userKey}_workout_progress`);
      if (storedProgress) {
        try { setWorkoutProgress(JSON.parse(storedProgress)); } catch (e) {}
      }
    }

    const fetches = [];

    // 1. Fetch user data from DB
    if (activeUserName !== 'Guest User') {
      fetches.push(
        fetch(`/api/users/${encodeURIComponent(activeUserName)}`)
          .then(res => res.ok ? res.json() : null)
          .then(user => {
            if (user && !user.message && user._id) {
              setUserData(user);
              if (user.profilePic) {
                setProfilePic(user.profilePic);
                if (isOwnProfile) localStorage.setItem(`gymsync_${userKey}_pic`, user.profilePic);
              }
              setStats({
                points: Number(user.points) || 0,
                streak: Number(user.streak) || 0
              });

              if (user.bioData || user.bio || user.location || user.city) {
                const b = user.bioData || {};
                setBio(prev => ({
                  ...prev,
                  height: b.height || prev.height || '',
                  weight: b.weight || prev.weight || '',
                  bodyType: b.bodyType || prev.bodyType || 'healthy',
                  fitnessGoals: b.mainGoalArea || (b.goals && b.goals[0]) || user.fitnessGoal || prev.fitnessGoals || '',
                  location: user.location || user.city || prev.location || '',
                  trainingDaysPerWeek: b.trainingDaysPerWeek || prev.trainingDaysPerWeek || 3,
                  equipmentAccess: b.equipmentAccess || prev.equipmentAccess || 'Full Gym',
                  pushupBaseline: b.pushupBaseline || prev.pushupBaseline || 10,
                  targetMuscles: b.targetMuscles || prev.targetMuscles || [],
                  gender: b.gender || prev.gender || '',
                  units: b.units || prev.units || 'metric',
                  foodPreferences: b.foodPreferences || prev.foodPreferences || ''
                }));
              }
            }
          })
          .catch(err => console.error("Error fetching profile from DB:", err))
      );
    }

    // 2. Fetch posts
    fetches.push(
      fetch('/api/posts')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            setMyPosts(data.filter(p => p && (p.authorName === activeUserName || p.author?.name === activeUserName)));
          } else {
            setMyPosts([]);
          }
        })
        .catch(err => {
          console.error(err);
          setMyPosts([]);
        })
    );

    // 3. Follow check if viewing another user
    if (!isOwnProfile && loggedInUserName !== 'Guest User') {
      fetches.push(
        fetch(`/api/users/${encodeURIComponent(loggedInUserName)}`)
          .then(res => res.ok ? res.json() : null)
          .then(me => {
            if (me && Array.isArray(me.following)) {
              setIsFollowing(me.following.includes(activeUserName));
            }
          })
          .catch(err => console.warn("Error fetching following state:", err))
      );
    }

    // 4. Gym gig if own profile and GymOwner
    if (isOwnProfile && loggedInRole === 'GymOwner') {
      fetches.push(
        fetch(`/api/gym-owner/dashboard/${encodeURIComponent(activeUserName)}`, {
          headers: { 'Authorization': `Bearer ${authToken || ''}` }
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && data.gym && data.gym._id !== 'gym_demo_id') setMyGymGig(data.gym);
          })
          .catch(err => console.error('Error fetching gym gig', err))
      );
    }

    Promise.allSettled(fetches).then(() => setIsLoading(false));
  }, [activeUserName, isOwnProfile, loggedInUserName]);

  // ─── Derived values ──────────────────────────────────────────────────────────
  const todayDate = new Date().toDateString();
  const safeHistory = Array.isArray(history) ? history : [];
  const todayHistory = safeHistory.filter(h => h && h.date && new Date(h.date).toDateString() === todayDate);
  const photoPosts = myPosts.filter(p => p.mediaUrl).slice(0, 6);

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="profile-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '30px' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <div style={{ width: '150px', height: '150px', borderRadius: '16px', background: 'var(--card-border)', animation: 'pulseBlue 2s infinite' }} />
          <div style={{ width: '250px', height: '40px', background: 'var(--card-border)', borderRadius: '8px', animation: 'pulseBlue 2s infinite' }} />
          <div style={{ width: '100%', maxWidth: '800px', height: '400px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', animation: 'pulseBlue 2s infinite', marginTop: '20px' }} />
        </div>
      </div>
    );
  }

  // ─── Render Sub-Sections ──────────────────────────────────────────────────
  const renderCardHeader = () => (
    <ProfileHeader
      userName={activeUserName}
      userRole={profileRole}
      bio={bio}
      profilePic={profilePic}
      userData={userData}
      stats={stats}
      instructorStats={instructorStats}
      isTrainee={isTrainee}
      fileInputRef={fileInputRef}
      handlePicUpload={handlePicUpload}
      workoutProgress={workoutProgress}
      history={history}
      setActiveTab={setActiveTab}
      isOwnProfile={isOwnProfile}
      isFollowing={isFollowing}
      isFollowPending={isFollowPending}
      handleFollowToggle={handleFollowToggle}
      handleOpenMessage={handleOpenMessage}
    />
  );

  const renderMainFeedContent = () => (
    <>
      {/* Today's Energy & Unified Calorie Tracker (Own Profile Only) */}
      {isTrainee && isOwnProfile && (
        <TodaysEnergyCard bio={bio} currentWeight={userData?.bioData?.weight} />
      )}

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
        {isOwnProfile && profileRole === 'GymOwner' && (
          <button className={`tab-btn ${activeTab === 'gig' ? 'active' : ''}`} onClick={() => setActiveTab('gig')}>
            Your Gym Gig
          </button>
        )}
        {isOwnProfile && (
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            Settings &amp; Privacy
          </button>
        )}
      </div>

      <div className="profile-content">
        {activeTab === 'posts' && (
          <ProfileTimelineTab
            bio={bio}
            userRole={profileRole}
            isAdminUser={isAdminUser}
            isTrainee={isTrainee}
            hideHealthData={hideHealthData}
            stats={stats}
            instructorStats={instructorStats}
            photoPosts={photoPosts}
            profilePic={profilePic}
            userName={activeUserName}
            loggedInUserName={loggedInUserName}
            isOwnProfile={isOwnProfile}
            myPosts={myPosts}
            newPostText={newPostText}
            setNewPostText={setNewPostText}
            selectedPostFile={selectedPostFile}
            setSelectedPostFile={setSelectedPostFile}
            postFileInputRef={postFileInputRef}
            isPublishingPost={isPublishingPost}
            handleCreateProfilePost={handleCreateProfilePost}
            handleLikePost={handleLikePost}
            handleAddComment={handleAddComment}
            handleDeleteComment={handleDeleteComment}
            handleAddReply={handleAddReply}
            handleDeleteReply={handleDeleteReply}
          />
        )}
        {activeTab === 'history' && isTrainee && (
          <ProfileHistoryTab
            upcoming={upcoming}
            todayHistory={todayHistory}
            safeHistory={safeHistory}
            aiPlan={aiPlan}
            workoutProgress={workoutProgress}
          />
        )}
        {activeTab === 'bio' && isTrainee && (
          <ProfileBioTab bio={bio} userName={activeUserName} isOwnProfile={isOwnProfile} />
        )}
        {isOwnProfile && activeTab === 'settings' && (
          <ProfileSettingsPanel
            activeSettingSection={activeSettingSection}
            setActiveSettingSection={setActiveSettingSection}
            userName={activeUserName}
            userRole={profileRole}
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
            bio={bio}
            stats={stats}
            history={history}
            myPosts={myPosts}
            profilePic={profilePic}
            setShowDeleteAccountModal={setShowDeleteAccountModal}
            setShowDeactivateAccountModal={setShowDeactivateAccountModal}
            setVerifyEmailInput={setVerifyEmailInput}
            setIsVerifyModalOpen={setIsVerifyModalOpen}
            onProfileUpdate={(updatedUser) => {
              setUserData(prev => ({ ...prev, ...updatedUser }));
              if (updatedUser?.name && updatedUser.name !== activeUserName) {
                localStorage.setItem('gymsync_user_name', updatedUser.name);
                window.dispatchEvent(new Event('gymsync_user_updated'));
              }
            }}
            toast={toast}
          />
        )}
        {isOwnProfile && activeTab === 'gig' && <ProfileGigTab myGymGig={myGymGig} />}
      </div>
    </>
  );

  return (
    <div className={`profile-page ${mobileSlide === 0 ? 'profile-mobile-locked' : ''}`}>
      <div className="container">
        {/* Desktop 2-Column Grid */}
        <div className="profile-desktop-grid">
          <aside className="profile-desktop-card-col">
            {renderCardHeader()}
          </aside>
          <main className="profile-desktop-main-col">
            {renderMainFeedContent()}
          </main>
        </div>

        {/* Mobile Swipeable 2-Slide Experience */}
        <div 
          className="profile-mobile-swipe-wrapper"
          onTouchStart={handleMobileTouchStart}
          onTouchMove={handleMobileTouchMove}
          onTouchEnd={handleMobileTouchEnd}
        >
          <div 
            className="profile-mobile-slides-track"
            style={{ transform: `translateX(-${mobileSlide * 100}%)` }}
          >
            {/* Slide 0: Card View (Fixed, viewport fit, zero scroll) */}
            <div className="profile-mobile-slide profile-card-slide">
              {renderCardHeader()}
              <div 
                className="profile-mobile-swipe-guide" 
                onClick={() => setMobileSlide(1)}
              >
                <span>Swipe left for activity &amp; feed</span>
                <ChevronRight size={14} />
              </div>
            </div>

            {/* Slide 1: Feed & Activity Hub (Scrollable) */}
            <div className="profile-mobile-slide profile-feed-slide">
              <button 
                type="button" 
                className="profile-mobile-back-btn" 
                onClick={() => setMobileSlide(0)}
              >
                <ChevronLeft size={14} />
                <span>Back to Athlete Card</span>
              </button>
              {renderMainFeedContent()}
            </div>
          </div>
        </div>
      </div>

      {rawImageSrc && (
        <ImageCropper imageSrc={rawImageSrc} onCropComplete={onCropComplete} onCancel={() => setRawImageSrc(null)} />
      )}

      <ProfileVerifyEmailModal
        isOpen={isVerifyModalOpen}
        onClose={() => { setIsVerifyModalOpen(false); setOtpStep(1); setOtpInput(''); }}
        otpStep={otpStep} setOtpStep={setOtpStep}
        verifyEmailInput={verifyEmailInput} setVerifyEmailInput={setVerifyEmailInput}
        otpInput={otpInput} setOtpInput={setOtpInput}
        isSendingOtp={isSendingOtp} isVerifyingOtp={isVerifyingOtp}
        handleSendEmailOtp={handleSendEmailOtp} handleVerifyEmailOtp={handleVerifyEmailOtp}
      />

      <ConfirmDialog
        isOpen={showDeleteAccountModal}
        title="Schedule Account Deletion (15-Day Grace Period)"
        message="Your account will be moved to the Recycle Bin and scheduled for permanent deletion in 15 days. You can log in at any time within the next 15 days to cancel deletion and restore your account. After 15 days, your data will be permanently wiped."
        confirmText="Move to Recycle Bin"
        isDanger={true}
        typedConfirmation="DELETE"
        loading={isDeletingAccount}
        onConfirm={handleDeleteAccount}
        onClose={() => setShowDeleteAccountModal(false)}
      />

      <ConfirmDialog
        isOpen={showDeactivateAccountModal}
        title="Deactivate Account"
        message="Are you sure you want to deactivate your account? Your profile and posts will be hidden from other members. You can reactivate your account at any time simply by logging back in."
        confirmText="Deactivate Account"
        isDanger={false}
        loading={isDeactivatingAccount}
        onConfirm={handleDeactivateAccount}
        onClose={() => setShowDeactivateAccountModal(false)}
      />
    </div>
  );
};

export default Profile;
