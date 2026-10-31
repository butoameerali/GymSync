import React, { useState, useEffect } from 'react';
import { Flame, Dumbbell, Trophy, UserPlus, Check, MessageCircle, Loader2, Camera, Calendar, MapPin, Edit3 } from 'lucide-react';
import './Profile.css';

const ProfileHeader = ({
  userName,
  userRole,
  bio,
  profilePic,
  userData,
  stats,
  isTrainee,
  fileInputRef,
  handlePicUpload,
  workoutProgress,
  history,
  setActiveTab,
  isOwnProfile = true,
  isFollowing = false,
  isFollowPending = false,
  handleFollowToggle,
  handleOpenMessage,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [profilePic]);

  const points = stats?.points || userData?.points || 0;
  const streak = stats?.streak || userData?.streak || 0;

  const totalExercises = 
    (workoutProgress?.completedExercises?.length) ||
    (history?.reduce((acc, h) => acc + (h.exercises?.length || 1), 0)) ||
    (points ? Math.floor(points / 10) : 0);

  const joinDate = userData?.createdAt
    ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Oct 2026';

  const rawHeight = bio?.height || userData?.bioData?.height;
  const heightVal = rawHeight ? (String(rawHeight).includes('cm') || String(rawHeight).includes("'") ? rawHeight : `${rawHeight} cm`) : null;
  const rawWeight = bio?.weight || userData?.bioData?.weight;
  const weightVal = rawWeight ? (String(rawWeight).includes('kg') ? rawWeight : `${rawWeight} kg`) : null;
  const locationVal = bio?.location || userData?.city || userData?.location || null;

  const initials = userName
    ? userName.trim().split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : 'U';

  const hasValidPic = Boolean(profilePic && typeof profilePic === 'string' && profilePic.trim() !== '' && !imgError);

  const handleEditBio = () => {
    if (setActiveTab) {
      setActiveTab('settings');
    } else {
      window.dispatchEvent(new Event('open-onboarding'));
    }
  };

  return (
    <div className="profile-modern-card-container">
      <div className="profile-modern-card">
        {/* Cover / Header Gradient Banner */}
        <div className="profile-card-cover-banner">
          <div className="profile-card-role-badge">
            <span>{userRole || 'Member'}</span>
          </div>
        </div>

        {/* Avatar Section */}
        <div className="profile-card-avatar-wrapper">
          <div className="profile-card-avatar-frame">
            {hasValidPic ? (
              <img 
                src={profilePic} 
                alt={userName} 
                onError={() => setImgError(true)} 
                className="profile-card-avatar-img" 
              />
            ) : (
              <div className="profile-card-avatar-fallback">
                <span className="avatar-fallback-initials">{initials}</span>
              </div>
            )}

            {isOwnProfile && (
              <button 
                type="button" 
                className="profile-card-avatar-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef?.current && fileInputRef.current.click();
                }}
                title="Change Profile Photo"
                aria-label="Change Profile Photo"
              >
                <Camera size={14} />
              </button>
            )}
          </div>
        </div>

        {/* User Identity */}
        <div className="profile-card-identity">
          <h2 className="profile-card-display-name" title={userName}>{userName}</h2>
          <span className="profile-card-username-handle">
            @{userName ? userName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user'}
          </span>

          <p className="profile-card-bio-tagline">
            {bio?.fitnessGoals || (userRole === 'GymTrainer' ? 'Certified Gym Trainer & Fitness Coach' : userRole === 'GymOwner' ? 'Gym Owner & Facility Partner' : 'GymSync Community Member')}
          </p>

          {/* Measurements & Location Pills */}
          {(heightVal || weightVal || locationVal) && (
            <div className="profile-card-chips-row">
              {heightVal && <span className="profile-chip">📏 {heightVal}</span>}
              {weightVal && <span className="profile-chip">⚖️ {weightVal}</span>}
              {locationVal && <span className="profile-chip"><MapPin size={12} /> {locationVal}</span>}
            </div>
          )}

          {/* Athletic Performance Metric Boxes */}
          <div className="profile-card-metrics-grid">
            <div className="profile-metric-box">
              <div className="metric-icon streak-icon">
                <Flame size={16} />
              </div>
              <span className="metric-number">{streak}</span>
              <span className="metric-label">DAY STREAK</span>
            </div>

            <div className="profile-metric-box">
              <div className="metric-icon workout-icon">
                <Dumbbell size={16} />
              </div>
              <span className="metric-number">{totalExercises}</span>
              <span className="metric-label">WORKOUTS</span>
            </div>

            <div className="profile-metric-box">
              <div className="metric-icon xp-icon">
                <Trophy size={16} />
              </div>
              <span className="metric-number">{points.toLocaleString()}</span>
              <span className="metric-label">XP POINTS</span>
            </div>
          </div>

          {/* Social Counts */}
          <div className="profile-card-social-counts">
            <div className="social-count-item">
              <strong>{userData?.followers?.length || 0}</strong>
              <span>Followers</span>
            </div>
            <div className="social-count-divider" />
            <div className="social-count-item">
              <strong>{userData?.following?.length || 0}</strong>
              <span>Following</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-card-actions-wrapper">
            {!isOwnProfile ? (
              <div className="profile-visitor-btn-group">
                <button 
                  type="button"
                  className={`btn-profile-primary ${isFollowing ? 'following' : ''}`} 
                  onClick={handleFollowToggle} 
                  disabled={isFollowPending}
                >
                  {isFollowPending ? <Loader2 size={16} className="animate-spin" /> : isFollowing ? <Check size={16}/> : <UserPlus size={16}/>} 
                  <span>{isFollowing ? 'Following' : 'Follow'}</span>
                </button>
                <button 
                  type="button"
                  className="btn-profile-secondary" 
                  onClick={handleOpenMessage}
                >
                  <MessageCircle size={16}/>
                  <span>Message</span>
                </button>
              </div>
            ) : (
              <div className="profile-owner-btn-group">
                <button 
                  type="button"
                  className="btn-profile-secondary full-width" 
                  onClick={handleEditBio}
                >
                  <Edit3 size={15} />
                  <span>Edit Profile / Bio</span>
                </button>
              </div>
            )}
          </div>

          {/* Join Date Footer */}
          <div className="profile-card-footer-meta">
            <Calendar size={13} />
            <span>Member since {joinDate}</span>
          </div>
        </div>

        {/* Hidden File Input for Avatar Upload */}
        {isOwnProfile && (
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={handlePicUpload} 
          />
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
