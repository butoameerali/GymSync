import React, { useState, useRef } from 'react';
import { Flame, Zap, Camera, Dumbbell, Sparkles, Maximize2, X, Edit3, Trophy, ChevronLeft, ChevronRight, User } from 'lucide-react';
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
  const [activeMobileSlide, setActiveMobileSlide] = useState(0); // 0: Card, 1: Intro, 2: Stats
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});
  const [glareStyle, setGlareStyle] = useState({});

  const isAdminUser = ['SuperAdmin', 'Admin', 'ComplaintModerator'].includes(userRole);
  const points = stats?.points || 0;
  const streak = stats?.streak || 0;
  const level = Math.max(1, Math.floor(points / 100) + 1);
  const powerScore = Math.min(99, 60 + Math.floor(points / 50) + (streak * 2));

  const totalExercises = 
    (workoutProgress?.completedExercises?.length) ||
    (history?.reduce((acc, h) => acc + (h.exercises?.length || 1), 0)) ||
    (points ? Math.floor(points / 10) : 0);

  const joinDate = userData?.createdAt
    ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Member';

  const rawHeight = bio?.height || userData?.bioData?.height;
  const heightVal = rawHeight ? (String(rawHeight).includes('cm') || String(rawHeight).includes("'") ? rawHeight : `${rawHeight} cm`) : "--";
  const rawWeight = bio?.weight || userData?.bioData?.weight;
  const weightVal = rawWeight ? (String(rawWeight).includes('kg') ? rawWeight : `${rawWeight} kg`) : "--";

  const handleEditProfile = () => {
    if (setActiveTab) setActiveTab('bio');
    localStorage.setItem('gymsync_onboarding_skip_date', '');
    window.dispatchEvent(new Event('open-onboarding'));
  };

  // 3D Card Tilt Interaction
  const handleMouseMove = (e) => {
    if (!cardRef.current || window.innerWidth < 768) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const rotX = (0.5 - y) * 16;
    const rotY = (x - 0.5) * 16;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.08s ease-out'
    });

    setGlareStyle({
      background: `radial-gradient(circle at ${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%, rgba(255, 240, 180, 0.4) 0%, rgba(212, 175, 55, 0.2) 30%, rgba(59, 130, 246, 0.15) 55%, transparent 75%)`,
      opacity: 1
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
    });
    setGlareStyle({ opacity: 0 });
  };

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const delta = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0 && activeMobileSlide < 2) {
        setActiveMobileSlide(prev => prev + 1);
      } else if (delta < 0 && activeMobileSlide > 0) {
        setActiveMobileSlide(prev => prev - 1);
      }
    }
  };

  const renderCard = (isHd = false) => (
    <div 
      className={`pokemon-fullart-card athlete-3d-card ${isHd ? 'pokemon-card-hd' : ''}`}
      ref={!isHd ? cardRef : null}
      style={!isHd ? tiltStyle : {}}
      onMouseMove={!isHd ? handleMouseMove : undefined}
      onMouseLeave={!isHd ? handleMouseLeave : undefined}
    >
      {/* Holographic Rainbow Foil Sheen */}
      <div className="pokemon-card-holo-sheen" style={!isHd ? glareStyle : {}} />

      {/* Top Header Bar: Real Athlete Info */}
      <div className="pokemon-card-top-bar">
        <div className="pokemon-stage-badge">
          <span className="stage-tag">ATHLETE</span>
          <span className="stage-role">{userRole || 'Member'}</span>
        </div>

        <h2 className="pokemon-card-name" title={userName}>{userName}</h2>

        <div className="pokemon-power-badge">
          <span className="power-label">PWR</span>
          <span className="power-val">{powerScore}</span>
          <Zap size={13} className="power-icon" />
        </div>
      </div>

      {/* Center: Character Art Frame with Pop-Out Hero Artwork */}
      <div className="pokemon-card-art-frame athlete-art-frame">
        {/* Ambient Stadium/Gym Backdrop Glow */}
        <div className="athlete-art-ambient-glow" />

        {profilePic ? (
          <div className="athlete-hero-popout-container">
            <img 
              src={profilePic} 
              alt={userName} 
              className="pokemon-card-hero-img athlete-hero-popout-img" 
            />
          </div>
        ) : (
          <div className="pokemon-card-fallback-avatar">
            <UserAvatar src="" name={userName} size={130} />
          </div>
        )}

        {/* Level Ribbon Badge */}
        <div className="pokemon-card-lvl-badge">
          <Sparkles size={11} />
          <span>LEVEL {level}</span>
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
            title="Upload new photo"
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

      {/* Sub-strip: Real Measurements (Height, Weight, Location) */}
      <div className="pokemon-card-substrip">
        <span>HT: {heightVal}</span>
        <span>•</span>
        <span>WT: {weightVal}</span>
        {bio?.location && (
          <>
            <span>•</span>
            <span className="card-substrip-location">{bio.location}</span>
          </>
        )}
      </div>

      {/* Real Athletic Metrics: Streak, Exercises, Points */}
      <div className="pokemon-card-moves">
        {/* Metric 1: Streak */}
        <div className="pokemon-card-move-row">
          <div className="pokemon-move-cost-pills">
            <span className="cost-orb fire"><Flame size={12} /></span>
          </div>
          <div className="pokemon-move-content">
            <div className="pokemon-move-title-row">
              <span className="move-title">Streak Blaze</span>
              <span className="move-power">{streak} DAYS</span>
            </div>
            <p className="move-desc">Active continuous workout streak.</p>
          </div>
        </div>

        {/* Metric 2: Completed Exercises */}
        <div className="pokemon-card-move-row">
          <div className="pokemon-move-cost-pills">
            <span className="cost-orb steel"><Dumbbell size={12} /></span>
          </div>
          <div className="pokemon-move-content">
            <div className="pokemon-move-title-row">
              <span className="move-title">Exercise Mastery</span>
              <span className="move-power">{totalExercises} EXER</span>
            </div>
            <p className="move-desc">Total gym exercises completed.</p>
          </div>
        </div>

        {/* Metric 3: Total XP & Seniority */}
        <div className="pokemon-card-move-row">
          <div className="pokemon-move-cost-pills">
            <span className="cost-orb electric"><Trophy size={12} /></span>
          </div>
          <div className="pokemon-move-content">
            <div className="pokemon-move-title-row">
              <span className="move-title">XP Overdrive</span>
              <span className="move-power">{points.toLocaleString()} XP</span>
            </div>
            <p className="move-desc">Member Since: {joinDate} • Tier {level}</p>
          </div>
        </div>
      </div>

      {/* Authentic Collectible Card Footer */}
      <div className="pokemon-card-bottom">
        <div className="card-weakness-bar">
          <span>GymSync Verified Athlete</span>
          <span>•</span>
          <span>Member Since {joinDate}</span>
        </div>
        <div className="card-collector-code">
          GS-ATHLETE • OFFICIAL COLLECTIBLE • ACTIVE STATUS
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ========================================================
          MOBILE SWIPE NAVIGATION CONTROLS (< 700px)
          ======================================================== */}
      <div className="profile-mobile-nav-pills">
        <button 
          type="button" 
          className={`mobile-nav-pill ${activeMobileSlide === 0 ? 'active' : ''}`}
          onClick={() => setActiveMobileSlide(0)}
        >
          🃏 Athlete Card
        </button>
        <button 
          type="button" 
          className={`mobile-nav-pill ${activeMobileSlide === 1 ? 'active' : ''}`}
          onClick={() => setActiveMobileSlide(1)}
        >
          👤 Intro
        </button>
        <button 
          type="button" 
          className={`mobile-nav-pill ${activeMobileSlide === 2 ? 'active' : ''}`}
          onClick={() => setActiveMobileSlide(2)}
        >
          📊 Fitness Stats
        </button>
      </div>

      <section 
        className="profile-athlete-hero"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left Column: 3D Athlete Card & Action Bar */}
        <div className={`profile-athlete-card-column ${activeMobileSlide !== 0 ? 'mobile-slide-hidden' : ''}`}>
          <button 
            type="button" 
            className="profile-mobile-card-launch" 
            onClick={() => setIsHdModalOpen(true)}
          >
            <Maximize2 size={16} />
            <span>Open HD Full-Screen Card</span>
          </button>

          <div className="pokemon-card-wrapper">
            <div 
              className="pokemon-card-clickable-container"
              onClick={() => setIsHdModalOpen(true)}
              title="Click to view HD card image"
            >
              {renderCard(false)}
            </div>

            {/* Quick Action Bar below Card */}
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

        {/* Right Column: Real Intro & Progress Overview */}
        <aside className="profile-athlete-overview" aria-label="Athlete overview">
          {/* Panel 1: Intro */}
          <section className={`profile-overview-panel ${activeMobileSlide !== 1 && activeMobileSlide !== 0 ? 'mobile-panel-hidden' : ''}`}>
            <p className="profile-overview-eyebrow">ATHLETE PROFILE</p>
            <h2>Intro</h2>
            <p className="profile-overview-name">{userName || 'GymSync Athlete'}</p>
            <p className="profile-overview-role">{userRole || 'Athlete'} · Member since {joinDate}</p>

            <div className="profile-overview-details">
              <div>
                <span>Height</span>
                <strong>{heightVal}</strong>
              </div>
              <div>
                <span>Weight</span>
                <strong>{weightVal}</strong>
              </div>
              {bio?.location ? (
                <div className="profile-overview-location">
                  <span>Location</span>
                  <strong>{bio.location}</strong>
                </div>
              ) : null}
            </div>

            <button 
              type="button" 
              className="profile-overview-edit" 
              onClick={handleEditProfile}
            >
              <Edit3 size={15} />
              <span>Edit profile &amp; bio</span>
            </button>
          </section>

          {/* Panel 2: Real Fitness Stats */}
          <section className={`profile-overview-panel ${activeMobileSlide !== 2 && activeMobileSlide !== 0 ? 'mobile-panel-hidden' : ''}`}>
            <p className="profile-overview-eyebrow">YOUR PROGRESS</p>
            <h2>Fitness Stats</h2>

            <div className="profile-overview-stats">
              <div className="profile-overview-stat">
                <span>⚡</span>
                <div>
                  <strong>{points.toLocaleString()}</strong>
                  <small>Total XP</small>
                </div>
              </div>
              <div className="profile-overview-stat">
                <span>🔥</span>
                <div>
                  <strong>{streak}</strong>
                  <small>Day streak</small>
                </div>
              </div>
              <div className="profile-overview-stat">
                <span>🏋️</span>
                <div>
                  <strong>{totalExercises}</strong>
                  <small>Exercises</small>
                </div>
              </div>
              <div className="profile-overview-stat">
                <span>✦</span>
                <div>
                  <strong>{level}</strong>
                  <small>Current level</small>
                </div>
              </div>
            </div>
          </section>

          <p className="profile-overview-hint">Your verified progress, one workout at a time.</p>
        </aside>
      </section>

      {/* Mobile Slide Dot Indicators */}
      <div className="profile-mobile-dots">
        <span 
          className={`dot ${activeMobileSlide === 0 ? 'active' : ''}`}
          onClick={() => setActiveMobileSlide(0)}
        />
        <span 
          className={`dot ${activeMobileSlide === 1 ? 'active' : ''}`}
          onClick={() => setActiveMobileSlide(1)}
        />
        <span 
          className={`dot ${activeMobileSlide === 2 ? 'active' : ''}`}
          onClick={() => setActiveMobileSlide(2)}
        />
      </div>

      {/* ========================================================
          HD FULLSCREEN CARD LIGHTBOX / MODAL
          ======================================================== */}
      {isHdModalOpen && (
        <div className="pokemon-hd-modal-overlay" onClick={() => setIsHdModalOpen(false)}>
          <div className="pokemon-hd-modal-content" onClick={e => e.stopPropagation()}>
            <div className="pokemon-hd-modal-header">
              <span className="pokemon-hd-title">GymSync Athlete Collectible Card (HD View)</span>
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

