import React, { useState } from 'react';
import { Flame, Zap, Camera, Dumbbell, Sparkles, Maximize2, X, Edit3, Trophy, CheckCircle2 } from 'lucide-react';
import UserAvatar from '../../components/common/UserAvatar';

const ProfileHeader = ({
  userName,
  userRole,
  bio,
  profilePic,
  userData,
  stats,
  instructorStats,
  isTrainee,
  fileInputRef,
  handlePicUpload,
  workoutProgress,
  history,
  setActiveTab,
}) => {
  const [isHdModalOpen, setIsHdModalOpen] = useState(false);
  const points = Number(stats?.points ?? 0);
  const streak = Number(stats?.streak ?? 0);
  const totalExercises = workoutProgress?.completedExercises?.length
    ?? (Array.isArray(history) ? history.reduce((acc, item) => acc + (Array.isArray(item.exercises) ? item.exercises.length : 0), 0) : null);
  const joinDate = userData?.createdAt
    ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;
  const heightVal = bio?.height || userData?.bioData?.height || null;
  const rawWeight = bio?.weight || userData?.bioData?.weight || null;
  const weightVal = rawWeight ? (String(rawWeight).toLowerCase().includes('kg') ? rawWeight : `${rawWeight} kg`) : null;

  const handleEditProfile = () => {
    if (setActiveTab) setActiveTab('bio');
    localStorage.setItem('gymsync_onboarding_skip_date', '');
    window.dispatchEvent(new Event('open-onboarding'));
  };

  const renderCard = (isHd = false) => (
    <div className={`pokemon-fullart-card ${isHd ? 'pokemon-card-hd' : ''}`}>
      <div className="pokemon-card-holo-sheen" aria-hidden="true" />
      <div className="pokemon-card-top-bar">
        <span className="pokemon-card-member-label">{userRole || 'Member'}</span>
        <h2 className="pokemon-card-name" title={userName}>{userName || 'GymSync Member'}</h2>
        {points > 0 && <span className="pokemon-card-xp">{points.toLocaleString()} XP</span>}
      </div>
      <div className="pokemon-card-art-frame">
        {profilePic ? (
          <img src={profilePic} alt={userName ? `${userName} profile` : 'Profile'} className="pokemon-card-hero-img" />
        ) : (
          <div className="pokemon-card-fallback-avatar"><UserAvatar src="" name={userName} size={130} /></div>
        )}
        {!isHd && (
          <button type="button" className="pokemon-card-photo-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} title="Change profile photo">
            <Camera size={13} /><span>Change photo</span>
          </button>
        )}
      </div>
      <div className="pokemon-card-real-details">
        {heightVal && <span><small>HEIGHT</small><strong>{heightVal}</strong></span>}
        {weightVal && <span><small>WEIGHT</small><strong>{weightVal}</strong></span>}
        {joinDate && <span><small>MEMBER SINCE</small><strong>{joinDate}</strong></span>}
      </div>
      <div className="pokemon-card-progress">
        {typeof streak === 'number' && <div><Flame size={17} /><span><strong>{streak}</strong><small>Day streak</small></span></div>}
        {points > 0 && <div><Zap size={17} /><span><strong>{points.toLocaleString()}</strong><small>Points</small></span></div>}
        {typeof totalExercises === 'number' && totalExercises > 0 && <div><Dumbbell size={17} /><span><strong>{totalExercises}</strong><small>Exercises completed</small></span></div>}
      </div>
      <div className="pokemon-card-bottom"><span>GYMSYNC</span><span>ATHLETE PROFILE</span></div>
    </div>
  );

  return (
    <>
      <section className="profile-athlete-hero">
        <div className="profile-athlete-card-column">
          <button type="button" className="profile-mobile-card-launch" onClick={() => setIsHdModalOpen(true)}>
            <Maximize2 size={16} /><span>View Athlete Card</span>
          </button>
          <div className="pokemon-card-wrapper">
        <div 
          className="pokemon-card-clickable-container"
          onClick={() => setIsHdModalOpen(true)}
          title="Click to view HD card image"
        >
          {renderCard(false)}
        </div>

        {/* Card Quick Action Bar: Edit Profile, Change Photo, HD Preview */}
        <div className="pokemon-card-action-bar">
          <button 
            type="button" 
            className="card-action-btn edit-btn"
            onClick={handleEditProfile}
          >
            <Edit3 size={15} />
            <span>Edit Profile & Bio</span>
          </button>
          <button 
            type="button" 
            className="card-action-btn photo-btn"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <Camera size={15} />
            <span>Change Photo</span>
          </button>
          <button 
            type="button" 
            className="card-action-btn inspect-btn"
            onClick={() => setIsHdModalOpen(true)}
          >
            <Maximize2 size={15} />
            <span>HD View</span>
          </button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={handlePicUpload} 
        />
          </div>
        </div>
        <aside className="profile-athlete-overview" aria-label="Athlete overview">
          <section className="profile-overview-panel">
            <p className="profile-overview-eyebrow">ATHLETE PROFILE</p>
            <h2>Intro</h2>
            <p className="profile-overview-name">{userName || 'GymSync Athlete'}</p>
            <p className="profile-overview-role">{userRole || 'Athlete'} · Member since {joinDate}</p>
            <div className="profile-overview-details">
              {heightVal && <div><span>Height</span><strong>{heightVal}</strong></div>}
              {weightVal && <div><span>Weight</span><strong>{weightVal}</strong></div>}
              {(bio?.location || userData?.bioData?.location) && <div className="profile-overview-location"><span>Location</span><strong>{bio?.location || userData?.bioData?.location}</strong></div>}
            </div>
            <button type="button" className="profile-overview-edit" onClick={handleEditProfile}><Edit3 size={15} /> Edit profile &amp; bio</button>
          </section>
          <section className="profile-overview-panel">
            <p className="profile-overview-eyebrow">YOUR PROGRESS</p>
            <h2>Fitness Stats</h2>
            <div className="profile-overview-stats">
              <div className="profile-overview-stat"><span>⚡</span><div><strong>{points.toLocaleString()}</strong><small>Total XP</small></div></div>
              <div className="profile-overview-stat"><span>🔥</span><div><strong>{streak}</strong><small>Day streak</small></div></div>
              <div className="profile-overview-stat"><span>🏋️</span><div><strong>{totalExercises}</strong><small>Exercises</small></div></div>
              
            </div>
          </section>
          <p className="profile-overview-hint">Your progress, one workout at a time.</p>
        </aside>
      </section>

      {/* HD Card Lightbox / Modal */}
      {isHdModalOpen && (
        <div className="pokemon-hd-modal-overlay" onClick={() => setIsHdModalOpen(false)}>
          <div className="pokemon-hd-modal-content" onClick={e => e.stopPropagation()}>
            <div className="pokemon-hd-modal-header">
              <span className="pokemon-hd-title">GymSync Athlete Trading Card (HD View)</span>
              <button 
                type="button" 
                className="pokemon-hd-close-btn" 
                onClick={() => setIsHdModalOpen(false)}
                aria-label="Close HD Card"
              >
                <X size={20} />
              </button>
            </div>

            <div className="pokemon-hd-card-stage">
              {renderCard(true)}
            </div>

            <div className="pokemon-hd-modal-footer">
              <button 
                type="button" 
                className="card-action-btn edit-btn"
                onClick={() => {
                  setIsHdModalOpen(false);
                  handleEditProfile();
                }}
                style={{ padding: '8px 18px' }}
              >
                <Edit3 size={15} />
                <span>Edit Profile & Bio</span>
              </button>
              <button 
                type="button" 
                className="card-action-btn photo-btn"
                onClick={() => {
                  setIsHdModalOpen(false);
                  fileInputRef.current && fileInputRef.current.click();
                }}
                style={{ padding: '8px 18px' }}
              >
                <Camera size={15} />
                <span>Change Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileHeader;
