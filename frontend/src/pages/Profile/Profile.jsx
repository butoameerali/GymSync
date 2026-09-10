import React, { useState, useEffect, useRef } from 'react';
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

const Profile = () => {
  const userRole = localStorage.getItem('gymsync_role') || 'User';
  const isTrainee = userRole === 'User' || userRole === 'Guest';
  const [activeTab, setActiveTab] = useState('posts');
  const [activeSettingSection, setActiveSettingSection] = useState('general');

  // Stats
  const [stats, setStats] = useState({ points: 0, streak: 0 });
  const [instructorStats, setInstructorStats] = useState({
    programs: 0, diets: 0, articles: 0, tasksCompleted: 0
  });
  const [history, setHistory] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [myGymGig, setMyGymGig] = useState(null);
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const userKey = userName.replace(/\s+/g, '_');
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
  const isAdminUser = ['SuperAdmin', 'Admin', 'ComplaintModerator'].includes(userRole);
  const authToken = localStorage.getItem('gymsync_token');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    if (!verifyEmailInput.trim()) return;
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/users/send-verification-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
        body: JSON.stringify({ userName, email: verifyEmailInput.trim() })
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gymsync_token') || ''}` },
        body: JSON.stringify({ userName, email: verifyEmailInput.trim(), otp: otpInput.trim() })
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
    if (!newPostText.trim() && !selectedPostFile) { toast.warning('Please write something or attach a photo.'); return; }
    setIsPublishingPost(true);
    try {
      const formData = new FormData();
      formData.append('content', newPostText);
      formData.append('authorName', userName);
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
    try { const updated = await postService.likePost(postId); setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p))); }
    catch (err) { toast.error(err.message || 'Failed to like post'); }
  };

  const handleAddComment = async (postId, text) => {
    try { const updated = await postService.addComment(postId, text); setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p))); }
    catch (err) { toast.error(err.message || 'Failed to add comment'); }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try { const updated = await postService.deleteComment(postId, commentId); setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p))); }
    catch (err) { toast.error(err.message || 'Failed to delete comment'); }
  };

  const handleAddReply = async (postId, commentId, text) => {
    try { const updated = await postService.addReply(postId, commentId, text); setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p))); }
    catch (err) { toast.error(err.message || 'Failed to reply'); }
  };

  const handleDeleteReply = async (postId, commentId, replyId) => {
    try { const updated = await postService.deleteReply(postId, commentId, replyId); setMyPosts(prev => prev.map(p => ((p._id === postId || p.id === postId) ? updated : p))); }
    catch (err) { toast.error(err.message || 'Failed to delete reply'); }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const response = await fetch('/api/users/me', { method: 'DELETE', headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.message || 'Unable to delete account.'); }
      ['userInfo', 'gymsync_token', 'gymsync_role', 'gymsync_user_name'].forEach(k => localStorage.removeItem(k));
      setShowDeleteAccountModal(false);
      window.location.href = '/';
    } catch (err) { toast.error(err.message || 'Failed to delete account'); }
    finally { setIsDeletingAccount(false); }
  };

  const handlePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setRawImageSrc(reader.result); reader.readAsDataURL(file); }
    if (e.target) e.target.value = null;
  };

  const saveProfilePic = async (image) => {
    localStorage.setItem(`gymsync_${userKey}_pic`, image);
    const response = await fetch('/api/users/profile-pic', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      body: JSON.stringify({ profilePic: image })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to save profile picture.');
  };

  const onCropComplete = async (croppedImage) => {
    setProfilePic(croppedImage);
    setRawImageSrc(null);
    try { await saveProfilePic(croppedImage); toast.success('Profile picture updated.'); }
    catch (error) { toast.error(error.message); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(''); setPasswordMessage('');
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
    const mockPoints = localStorage.getItem(`gymsync_${userKey}_points`) || '0';
    const mockStreak = localStorage.getItem(`gymsync_${userKey}_streak`) || '0';
    setStats({ points: parseInt(mockPoints), streak: parseInt(mockStreak) });

    let rawHistory = [];
    try { const parsed = JSON.parse(localStorage.getItem(`gymsync_${userKey}_history`) || '[]'); rawHistory = Array.isArray(parsed) ? parsed : []; }
    catch (e) { rawHistory = []; }
    setHistory([...rawHistory].reverse());

    if (userRole === 'FitnessInstructor') {
      const token = localStorage.getItem('gymsync_token') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      Promise.all([
        fetch('/api/plans/premade', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/articles', { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/instructor-requests', { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
      ]).then(([plans, articles, requests]) => {
        setInstructorStats({
          programs: (plans || []).filter(p => (p.type === 'workout' || !p.type)).length,
          diets: (plans || []).filter(p => p.type === 'diet').length,
          articles: (articles || []).length,
          tasksCompleted: (requests || []).filter(r => r.status === 'Completed').length
        });
      }).catch(err => console.error('Error fetching instructor stats:', err));
    }

    const loadBioData = () => {
      const bioFilled = localStorage.getItem(`gymsync_${userKey}_bio_filled`) === 'true' || localStorage.getItem('gymsync_bio_filled') === 'true';
      if (bioFilled) {
        const storedBio = localStorage.getItem(`gymsync_${userKey}_bio_data`) || localStorage.getItem(`gymsync_${userKey}_bio`);
        if (storedBio) { try { setBio(JSON.parse(storedBio)); } catch (e) { console.error("Error parsing bio data", e); } }
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
      if (storedProgress) { try { setWorkoutProgress(JSON.parse(storedProgress)); } catch (e) {} }
      if (userName !== 'Guest User') {
        fetch('/api/users/workout-progress', { headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } })
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
              if (user.profilePic) { setProfilePic(user.profilePic); localStorage.setItem(`gymsync_${userKey}_pic`, user.profilePic); }
            }
          })
          .catch(err => console.error("Error fetching profile from DB:", err))
      );
    }
    fetches.push(
      fetch('/api/posts')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data)) setMyPosts(data.filter(p => p && (p.authorName === userName || p.author?.name === userName)));
          else setMyPosts([]);
        })
        .catch(err => { console.error(err); setMyPosts([]); })
    );
    if (localStorage.getItem('gymsync_role') === 'GymOwner') {
      fetches.push(
        fetch(`/api/gym-owner/dashboard/${userName}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('gymsync_token') || ''}` } })
          .then(res => res.ok ? res.json() : null)
          .then(data => { if (data && data.gym && data.gym._id !== 'gym_demo_id') setMyGymGig(data.gym); })
          .catch(err => console.error('Error fetching gym gig', err))
      );
    }
    Promise.allSettled(fetches).then(() => setIsLoading(false));
    return () => window.removeEventListener('gymsync_bio_updated', loadBioData);
  }, [userKey, userName]);

  // ─── Derived values ──────────────────────────────────────────────────────────
  const todayDate = new Date().toDateString();
  const safeHistory = Array.isArray(history) ? history : [];
  const todayHistory = safeHistory.filter(h => h && h.date && new Date(h.date).toDateString() === todayDate);
  const photoPosts = myPosts.filter(p => p.mediaUrl).slice(0, 6);

  // ─── Loading skeleton ────────────────────────────────────────────────────────
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

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="profile-page">
      <div className="profile-cover"></div>
      <div className="container">
        <ProfileHeader
          userName={userName}
          userRole={userRole}
          bio={bio}
          profilePic={profilePic}
          userData={userData}
          stats={stats}
          instructorStats={instructorStats}
          isTrainee={isTrainee}
          fileInputRef={fileInputRef}
          handlePicUpload={handlePicUpload}
          setVerifyEmailInput={setVerifyEmailInput}
          setIsVerifyModalOpen={setIsVerifyModalOpen}
        />

        {/* Navigation Tabs */}
        <div className="profile-tabs glass-panel">
          <button className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Timeline</button>
          {isTrainee && <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Workout History</button>}
          {isTrainee && <button className={`tab-btn ${activeTab === 'bio' ? 'active' : ''}`} onClick={() => setActiveTab('bio')}>Health Bio</button>}
          {userRole === 'GymOwner' && <button className={`tab-btn ${activeTab === 'gig' ? 'active' : ''}`} onClick={() => setActiveTab('gig')}>Your Gym Gig</button>}
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings &amp; Privacy</button>
        </div>

        <div className="profile-content">
          {activeTab === 'posts' && (
            <ProfileTimelineTab
              bio={bio} userRole={userRole} isAdminUser={isAdminUser} isTrainee={isTrainee}
              hideHealthData={hideHealthData} stats={stats} instructorStats={instructorStats}
              photoPosts={photoPosts} profilePic={profilePic} userName={userName}
              myPosts={myPosts} newPostText={newPostText} setNewPostText={setNewPostText}
              selectedPostFile={selectedPostFile} setSelectedPostFile={setSelectedPostFile}
              postFileInputRef={postFileInputRef} isPublishingPost={isPublishingPost}
              handleCreateProfilePost={handleCreateProfilePost} handleLikePost={handleLikePost}
              handleAddComment={handleAddComment} handleDeleteComment={handleDeleteComment}
              handleAddReply={handleAddReply} handleDeleteReply={handleDeleteReply}
            />
          )}
          {activeTab === 'history' && (
            <ProfileHistoryTab upcoming={upcoming} todayHistory={todayHistory} safeHistory={safeHistory} aiPlan={aiPlan} workoutProgress={workoutProgress} />
          )}
          {activeTab === 'bio' && <ProfileBioTab bio={bio} />}
          {activeTab === 'settings' && (
            <ProfileSettingsPanel
              activeSettingSection={activeSettingSection} setActiveSettingSection={setActiveSettingSection}
              userName={userName} userRole={userRole} userData={userData}
              currentPassword={currentPassword} setCurrentPassword={setCurrentPassword}
              newPassword={newPassword} setNewPassword={setNewPassword}
              confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
              passwordMessage={passwordMessage} passwordError={passwordError}
              handleChangePassword={handleChangePassword} hideHealthData={hideHealthData}
              setHideHealthData={setHideHealthData} bio={bio} stats={stats}
              history={history} myPosts={myPosts} profilePic={profilePic}
              setShowDeleteAccountModal={setShowDeleteAccountModal}
              setVerifyEmailInput={setVerifyEmailInput} setIsVerifyModalOpen={setIsVerifyModalOpen}
              toast={toast}
            />
          )}
          {activeTab === 'gig' && <ProfileGigTab myGymGig={myGymGig} />}
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
