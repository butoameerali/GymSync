import React, { useState, useEffect } from 'react';
import { Flame, Zap, Camera, Dumbbell, Sparkles, Maximize2, X, Edit3, Trophy, ArrowLeft, Shield, Calendar, User, Heart, ChevronRight } from 'lucide-react';
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
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState(0); // 0 = Card, 1 = Bio, 2 = Stats
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);

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
  const locationVal = bio?.location ? bio.location : (isAdminUser ? 'HQ Arena' : 'GymSync Arena');

  const handleEditProfile = () => {
    if (setActiveTab) setActiveTab('bio');
    localStorage.setItem('gymsync_onboarding_skip_date', '');
    window.dispatchEvent(new Event('open-onboarding'));
  };

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCardModalOpen) {
        setIsCardModalOpen(false);
      }
    };
    if (isCardModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isCardModalOpen]);

  // Touch swipe navigation for mobile card modal
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    if (touchStartX === null || touchStartY === null || !e.changedTouches || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    // Check if horizontal swipe is dominant and significant (> 45px)
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        // Swiped left -> Next tab
        setActiveModalTab((prev) => Math.min(2, prev + 1));
      } else {
        // Swiped right -> Previous tab
        setActiveModalTab((prev) => Math.max(0, prev - 1));
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  // The Collectible Athlete Trading Card
  const renderTradingCard = (isHd = false) => (
    <div className={`pokemon-fullart-card ${isHd ? 'pokemon-card-hd' : ''}`}>
      {/* Restrained Holographic Metallic Foil Sheen */}
      <div className="pokemon-card-holo-sheen" />

      {/* Top Header Bar: Metallic Gold Trim & Athlete Level */}
      <div className="pokemon-card-top-bar">
        <div className="pokemon-stage-badge">
          <span className="stage-tag">GS ATHLETE</span>
          <span className="stage-role">{userRole || 'Athlete'}</span>
        </div>

        <h2 className="pokemon-card-name" title={userName}>{userName}</h2>

        <div className="pokemon-hp-group">
          <span className="pokemon-hp-label">POWER</span>
          <span className="pokemon-hp-value">{hp}</span>
          <div className="pokemon-energy-orb" title="Athletic Energy">
            <Zap size={11} />
          </div>
        </div>
      </div>

      {/* Center: Character Art Frame (Dual-layer fit: Ambient backdrop + crisp foreground hero) */}
      <div className="pokemon-card-art-frame">
        {profilePic ? (
          <>
            <img 
              src={profilePic} 
              alt="" 
              className="pokemon-card-ambient-backdrop" 
              aria-hidden="true" 
            />
            <img 
              src={profilePic} 
              alt={userName} 
              className="pokemon-card-hero-img" 
            />
            <div className="pokemon-card-art-vignette" />
          </>
        ) : (
          <div className="pokemon-card-fallback-avatar">
            <UserAvatar src="" name={userName} size={120} />
            <span className="fallback-avatar-text">Athlete Portrait</span>
          </div>
        )}

        {/* Level Ribbon Badge */}
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
            title="Upload new athlete photo"
            aria-label="Change Athlete Photo"
          >
            <Camera size={12} />
            <span>Photo</span>
          </button>
        )}

        {/* Inspect Card Button */}
        {!isHd && (
          <button 
            type="button" 
            className="pokemon-card-inspect-btn"
            onClick={(e) => {
              e.stopPropagation();
              setActiveModalTab(0);
              setIsCardModalOpen(true);
            }}
            title="Open Dedicated Card View"
            aria-label="Open Fullscreen Card View"
          >
            <Maximize2 size={12} />
            <span>Card View</span>
          </button>
        )}
      </div>

      {/* Sub-strip Pokedex Measurements */}
      <div className="pokemon-card-substrip">
        <span>NO. #GS-001</span>
        <span>•</span>
        <span>HT: {heightVal}</span>
        <span>•</span>
        <span>WT: {weightVal}</span>
        <span>•</span>
        <span>{locationVal}</span>
      </div>

      {/* Card Moves / Fitness Information Rows */}
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
            <p className="move-desc">Daily workout streak & training discipline.</p>
          </div>
        </div>

        {/* Move 2: Total Exercises / Instructor */}
        <div className="pokemon-card-move-row">
          <div className="pokemon-move-cost-pills">
            <span className="cost-orb steel"><Dumbbell size={11} /></span>
            <span className="cost-orb steel"><Dumbbell size={11} /></span>
          </div>
          <div className="pokemon-move-content">
            <div className="pokemon-move-title-row">
              <span className="move-title">{userRole === 'FitnessInstructor' ? 'Master Coaching' : 'Exercise Mastery'}</span>
              <span className="move-power">
                {userRole === 'FitnessInstructor' ? `${instructorStats?.programs || 0} PRG` : `${totalExercises} EXER`}
              </span>
            </div>
            <p className="move-desc">
              {userRole === 'FitnessInstructor' ? 'Active fitness programs & athlete guidance.' : 'Total gym movements & training drills completed.'}
            </p>
          </div>
        </div>

        {/* Move 3: Total Points & Join Date */}
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
            <p className="move-desc">Seniority: Joined {joinDate} • Tier {level} Performance</p>
          </div>
        </div>
      </div>

      {/* Card Footer: Sports Collectible Identifier */}
      <div className="pokemon-card-bottom">
        <div className="card-weakness-bar">
          <span>Weakness: Rest Day ×2</span>
          <span>•</span>
          <span>Resistance: Fatigue -30</span>
          <span>•</span>
          <span>Retreat: ⚡</span>
        </div>
        <div className="card-collector-code">
          GymSync Athletic Collectible • 1st Edition • Card #GS-001 • Ultra Rare ★★★
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="athlete-card-presentation-wrapper">
        {/* Clickable Card Container */}
        <div 
          className="pokemon-card-clickable-container"
          onClick={() => {
            setActiveModalTab(0);
            setIsCardModalOpen(true);
          }}
          title="Click to view interactive full-screen card"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveModalTab(0);
              setIsCardModalOpen(true);
            }
          }}
        >
          {renderTradingCard(false)}
        </div>

        {/* Card Quick Action Bar */}
        <div className="athlete-card-action-bar">
          <button 
            type="button" 
            className="athlete-action-btn primary-action-btn"
            onClick={() => {
              setActiveModalTab(0);
              setIsCardModalOpen(true);
            }}
          >
            <Maximize2 size={14} />
            <span>View Athlete Card</span>
          </button>

          <button 
            type="button" 
            className="athlete-action-btn edit-action-btn"
            onClick={handleEditProfile}
          >
            <Edit3 size={14} />
            <span>Edit Profile</span>
          </button>

          <button 
            type="button" 
            className="athlete-action-btn photo-action-btn"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <Camera size={14} />
            <span>Change Photo</span>
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

      {/* ========================================================
          DEDICATED FULL-SCREEN ATHLETE CARD EXPERIENCE (Mobile & Desktop)
          With horizontal swipe gestures between Card, Bio, and Stats
          ======================================================== */}
      {isCardModalOpen && (
        <div 
          className="athlete-fullscreen-modal-overlay" 
          onClick={() => setIsCardModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Athlete Trading Card Full Screen View"
        >
          <div 
            className="athlete-fullscreen-modal-container" 
            onClick={e => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Modal Header Bar with Segmented Tab Controls */}
            <header className="athlete-modal-header">
              <button 
                type="button" 
                className="modal-nav-back-btn" 
                onClick={() => setIsCardModalOpen(false)}
                aria-label="Close card view"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>

              {/* Segmented Navigation Pills */}
              <div className="modal-segmented-nav" role="tablist">
                <button 
                  type="button" 
                  role="tab"
                  aria-selected={activeModalTab === 0}
                  className={`modal-nav-pill ${activeModalTab === 0 ? 'active' : ''}`}
                  onClick={() => setActiveModalTab(0)}
                >
                  <span>🃏 Card</span>
                </button>
                <button 
                  type="button" 
                  role="tab"
                  aria-selected={activeModalTab === 1}
                  className={`modal-nav-pill ${activeModalTab === 1 ? 'active' : ''}`}
                  onClick={() => setActiveModalTab(1)}
                >
                  <span>📋 Bio</span>
                </button>
                <button 
                  type="button" 
                  role="tab"
                  aria-selected={activeModalTab === 2}
                  className={`modal-nav-pill ${activeModalTab === 2 ? 'active' : ''}`}
                  onClick={() => setActiveModalTab(2)}
                >
                  <span>📊 Stats</span>
                </button>
              </div>

              <button 
                type="button" 
                className="modal-close-icon-btn" 
                onClick={() => setIsCardModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            {/* Modal Body / Swipeable Panels */}
            <main className="athlete-modal-body">
              {/* Panel 0: HD Athlete Trading Card */}
              {activeModalTab === 0 && (
                <div className="modal-panel-stage card-panel-view">
                  {renderTradingCard(true)}
                  <div className="mobile-swipe-guide">
                    <span>← Swipe for Bio &amp; Fitness Stats →</span>
                  </div>
                </div>
              )}

              {/* Panel 1: Athlete Intro & Biological Details */}
              {activeModalTab === 1 && (
                <div className="modal-panel-stage bio-panel-view">
                  <div className="modal-bio-card glass-panel">
                    <div className="modal-bio-header">
                      <div className="modal-avatar-wrapper">
                        <UserAvatar src={profilePic} name={userName} size={70} />
                      </div>
                      <div>
                        <h3>{userName}</h3>
                        <p className="modal-role-text">{userRole || 'Athlete'} • Member Since {joinDate}</p>
                        <span className="modal-location-tag">{locationVal}</span>
                      </div>
                    </div>

                    <div className="modal-bio-grid">
                      <div className="modal-bio-cell">
                        <span className="cell-label">Height</span>
                        <span className="cell-value">{heightVal}</span>
                      </div>
                      <div className="modal-bio-cell">
                        <span className="cell-label">Weight</span>
                        <span className="cell-value">{weightVal}</span>
                      </div>
                      <div className="modal-bio-cell">
                        <span className="cell-label">Training Schedule</span>
                        <span className="cell-value">{bio?.trainingDaysPerWeek || 3} Days / Week</span>
                      </div>
                      <div className="modal-bio-cell">
                        <span className="cell-label">Equipment Access</span>
                        <span className="cell-value">{bio?.equipmentAccess || 'Full Gym'}</span>
                      </div>
                      <div className="modal-bio-cell full-width">
                        <span className="cell-label">Primary Fitness Goal</span>
                        <span className="cell-value">{bio?.mainGoalArea || bio?.fitnessGoals || 'Athletic Performance & Muscle Growth'}</span>
                      </div>
                      <div className="modal-bio-cell full-width">
                        <span className="cell-label">Baseline Push-ups Stamina</span>
                        <span className="cell-value" style={{ color: '#10b981' }}>{bio?.pushupBaseline || 10} Reps</span>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={() => {
                        setIsCardModalOpen(false);
                        handleEditProfile();
                      }}
                      style={{ marginTop: '16px', width: '100%' }}
                    >
                      <Edit3 size={15} /> Edit Biological Profile
                    </button>
                  </div>
                </div>
              )}

              {/* Panel 2: Fitness Stats & Metrics */}
              {activeModalTab === 2 && (
                <div className="modal-panel-stage stats-panel-view">
                  <div className="modal-stats-card glass-panel">
                    <h3 className="modal-stats-title">
                      <Trophy size={18} color="#facc15" /> Athlete Performance Matrix
                    </h3>

                    <div className="modal-stats-grid">
                      <div className="stat-metric-cell">
                        <span className="metric-icon-wrap"><Flame size={20} color="#f97316" /></span>
                        <span className="metric-num">{streak}</span>
                        <span className="metric-label">Active Days Streak</span>
                      </div>

                      <div className="stat-metric-cell">
                        <span className="metric-icon-wrap"><Dumbbell size={20} color="#38bdf8" /></span>
                        <span className="metric-num">{totalExercises}</span>
                        <span className="metric-label">Exercises Completed</span>
                      </div>

                      <div className="stat-metric-cell">
                        <span className="metric-icon-wrap"><Zap size={20} color="#facc15" /></span>
                        <span className="metric-num">{points}</span>
                        <span className="metric-label">GymSync XP Points</span>
                      </div>

                      <div className="stat-metric-cell">
                        <span className="metric-icon-wrap"><Sparkles size={20} color="#a855f7" /></span>
                        <span className="metric-num">Tier {level}</span>
                        <span className="metric-label">Athlete Rank Tier</span>
                      </div>
                    </div>

                    <div className="stat-health-status">
                      <div className="status-indicator-dot" />
                      <div>
                        <strong>Active Training Status</strong>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Daily workout routine logged and tracked via GymSync Athlete Engine.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* Modal Bottom Actions */}
            <footer className="athlete-modal-footer">
              <button 
                type="button" 
                className="modal-footer-btn"
                onClick={() => {
                  setIsCardModalOpen(false);
                  handleEditProfile();
                }}
              >
                <Edit3 size={15} />
                <span>Edit Profile</span>
              </button>

              <button 
                type="button" 
                className="modal-footer-btn"
                onClick={() => {
                  setIsCardModalOpen(false);
                  fileInputRef.current && fileInputRef.current.click();
                }}
              >
                <Camera size={15} />
                <span>Change Photo</span>
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileHeader;
