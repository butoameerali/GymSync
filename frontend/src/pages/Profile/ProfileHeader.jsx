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
  const isAdminUser = ['SuperAdmin', 'Admin', 'ComplaintModerator'].includes(userRole);
  const points = stats?.points || 0;
  const streak = stats?.streak || 0;
  const level = Math.max(1, Math.floor(points / 100) + 1);
  const hp = Math.max(100, points + 120);

  const totalExercises = 
    (workoutProgress?.completedExercises?.length) ||
    (history?.reduce((acc, h) => acc + (h.exercises?.length || 1), 0)) ||
    (points ? Math.floor(points / 10) : 0);

  const joinDate = userData?.createdAt
    ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Active Member';

  const heightVal = bio?.height || userData?.bioData?.height || "5'10\"";
  const rawWeight = bio?.weight || userData?.bioData?.weight;
  const weightVal = rawWeight ? (String(rawWeight).includes('kg') ? rawWeight : `${rawWeight} kg`) : "72 kg";

  const handleEditProfile = () => {
    if (setActiveTab) setActiveTab('bio');
    localStorage.setItem('gymsync_onboarding_skip_date', '');
    window.dispatchEvent(new Event('open-onboarding'));
  };

  const renderCard = (isHd = false) => (
    <div className={`pokemon-fullart-card ${isHd ? 'pokemon-card-hd' : ''}`}>
      {/* Holographic Rainbow Foil Sheen */}
      <div className="pokemon-card-holo-sheen" />

      {/* Top Header Bar */}
      <div className="pokemon-card-top-bar">
        <div className="pokemon-stage-badge">
          <span className="stage-tag">BASIC</span>
          <span className="stage-role">{userRole || 'Athlete'}</span>
        </div>

        <h2 className="pokemon-card-name" title={userName}>{userName}</h2>

        <div className="pokemon-hp-group">
          <span className="pokemon-hp-label">HP</span>
          <span className="pokemon-hp-value">{hp}</span>
          <div className="pokemon-energy-orb" title="Energy: Electric">
            <Zap size={12} />
          </div>
        </div>
      </div>

      {/* Center: Dedicated Character Art Frame (Authentic Pokémon illustration window) */}
      <div className="pokemon-card-art-frame">
        {profilePic ? (
          <img 
            src={profilePic} 
            alt={userName} 
            className="pokemon-card-hero-img" 
          />
        ) : (
          <div className="pokemon-card-fallback-avatar">
            <UserAvatar src="" name={userName} size={130} />
          </div>
        )}

        {/* Level Ribbon on Art Frame */}
        <div className="pokemon-card-lvl-badge">
          <Sparkles size={11} />
          <span>LVL {level}</span>
        </div>

        {/* Change Photo Overlay Button */}
        {!isHd && (
          <button 
            type="button" 
            className="pokemon-card-photo-btn"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current && fileInputRef.current.click();
            }}
            title="Upload new photo or cutout"
          >
            <Camera size={12} />
            <span>Change</span>
          </button>
        )}

        {/* Inspect HD Card Button */}
        {!isHd && (
          <button 
            type="button" 
            className="pokemon-card-inspect-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsHdModalOpen(true);
            }}
            title="Open HD Full Screen Card"
          >
            <Maximize2 size={12} />
            <span>HD</span>
          </button>
        )}
      </div>

      {/* Sub-strip Pokedex Stats */}
      <div className="pokemon-card-substrip">
        <span>NO. 001</span>
        <span>•</span>
        <span>HT: {heightVal}</span>
        <span>•</span>
        <span>WT: {weightVal}</span>
        <span>•</span>
        <span>{bio?.location ? bio.location : (isAdminUser ? 'Headquarters' : 'GymSync Arena')}</span>
      </div>

      {/* Floating Moves & Power Overlays (Streak, Exercises, Points, Join Date) */}
      <div className="pokemon-card-moves">
        {/* Move 1: Streak */}
        <div className="pokemon-card-move-row">
          <div className="pokemon-move-cost-pills">
            <span className="cost-orb fire"><Flame size={11} /></span>
            <span className="cost-orb fire"><Flame size={11} /></span>
          </div>
          <div className="pokemon-move-content">
            <div className="pokemon-move-title-row">
              <span className="move-title">Streak Blaze</span>
              <span className="move-power">{streak} DAYS</span>
            </div>
            <p className="move-desc">Continuous active workout consistency & discipline.</p>
          </div>
        </div>

        {/* Move 2: Total Exercises */}
        <div className="pokemon-card-move-row">
          <div className="pokemon-move-cost-pills">
            <span className="cost-orb steel"><Dumbbell size={11} /></span>
            <span className="cost-orb steel"><Dumbbell size={11} /></span>
          </div>
          <div className="pokemon-move-content">
            <div className="pokemon-move-title-row">
              <span className="move-title">Exercise Mastery</span>
              <span className="move-power">{totalExercises} EXER</span>
            </div>
            <p className="move-desc">Total gym movements & training drills completed.</p>
          </div>
        </div>

        {/* Move 3: Total Points & Seniority */}
        <div className="pokemon-card-move-row">
          <div className="pokemon-move-cost-pills">
            <span className="cost-orb electric"><Zap size={11} /></span>
            <span className="cost-orb electric"><Trophy size={11} /></span>
          </div>
          <div className="pokemon-move-content">
            <div className="pokemon-move-title-row">
              <span className="move-title">XP Overdrive</span>
              <span className="move-power">{points} XP</span>
            </div>
            <p className="move-desc">Member Seniority: Joined {joinDate} • Rank: Tier {level}</p>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pokemon-card-bottom">
        <div className="card-weakness-bar">
          <span>Weakness: Rest Day ×2</span>
          <span>•</span>
          <span>Resistance: Fatigue -30</span>
          <span>•</span>
          <span>Retreat: ⚡</span>
        </div>
        <div className="card-collector-code">
          GymSync 1st Edition • Card #GS-001 • Holographic Ultra Rare ★★★
        </div>
      </div>
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
              <div><span>Height</span><strong>{heightVal}</strong></div>
              <div><span>Weight</span><strong>{weightVal}</strong></div>
              <div className="profile-overview-location"><span>Location</span><strong>{bio?.location || 'GymSync Arena'}</strong></div>
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
              <div className="profile-overview-stat"><span>✦</span><div><strong>{level}</strong><small>Current level</small></div></div>
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
