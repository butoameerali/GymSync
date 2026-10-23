import React from 'react';
import { Flame, Zap, Camera, Dumbbell, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  setVerifyEmailInput,
  setIsVerifyModalOpen,
}) => {
  const isAdminUser = ['SuperAdmin', 'Admin', 'ComplaintModerator'].includes(userRole);
  const isVerified = Boolean(userData?.isGoogleApproved || userData?.isEmailVerified);
  const points = stats?.points || 0;
  const streak = stats?.streak || 0;
  const level = Math.max(1, Math.floor(points / 100) + 1);
  const hp = Math.max(100, points + 120);

  return (
    <div className="pokemon-card-wrapper">
      {/* Outer Golden / Holo Card Frame */}
      <div className="pokemon-card">
        {/* Holographic Shimmer Effect Overlay */}
        <div className="pokemon-card-holo-sheen" />

        {/* Card Header: Stage, Name, HP, Type */}
        <div className="pokemon-card-header">
          <div className="pokemon-stage-badge">
            <span className="stage-tag">BASIC</span>
            <span className="stage-role">{userRole || 'Athlete'}</span>
          </div>

          <h2 className="pokemon-name">{userName}</h2>

          <div className="pokemon-hp-group">
            <span className="pokemon-hp-label">HP</span>
            <span className="pokemon-hp-value">{hp}</span>
            <div className="pokemon-energy-orb" title="Energy: Electric / Fitness">
              <Zap size={14} className="energy-icon" />
            </div>
          </div>
        </div>

        {/* Card Art / Photo Window */}
        <div className="pokemon-art-window">
          <div
            className="pokemon-art-avatar-wrapper avatar-clickable"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            title="Click to update photo"
          >
            <UserAvatar 
              src={profilePic} 
              name={userName} 
              size={130} 
              className="pokemon-art-avatar"
            />
            <div className="pokemon-avatar-hover">
              <Camera color="white" size={24} />
              <span>Change Photo</span>
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={handlePicUpload} 
          />

          {/* Level & Rarity Ribbon on the Art Window */}
          <div className="pokemon-art-badge">
            <Sparkles size={13} />
            <span>LVL {level}</span>
          </div>
        </div>

        {/* Sub-strip info: Specs / Pokedex style line */}
        <div className="pokemon-spec-strip">
          <span>NO. 001</span>
          <span>•</span>
          <span>HT: {bio?.height || "5'10\""}</span>
          <span>•</span>
          <span>WT: {bio?.weight || "72 kg"}</span>
          <span>•</span>
          <span>{bio?.location ? bio.location : (isAdminUser ? 'Headquarters' : 'GymSync Arena')}</span>
        </div>

        {/* Attacks / Moves / Power Section */}
        <div className="pokemon-moves-container">
          {/* Move 1: Streak Power */}
          <div className="pokemon-move">
            <div className="pokemon-move-cost">
              <span className="energy-dot fire" title="Fire Energy"><Flame size={13} /></span>
              <span className="energy-dot fire" title="Fire Energy"><Flame size={13} /></span>
            </div>
            <div className="pokemon-move-details">
              <div className="pokemon-move-name-row">
                <span className="pokemon-move-name">Streak Blaze</span>
                <span className="pokemon-move-damage">{streak} DAYS</span>
              </div>
              <p className="pokemon-move-desc">
                Unleashes uninterrupted workout consistency. Amplifies daily athletic discipline and focus.
              </p>
            </div>
          </div>

          <div className="pokemon-move-divider" />

          {/* Move 2: XP Power Strike or Instructor Moves */}
          {userRole === 'FitnessInstructor' ? (
            <div className="pokemon-move">
              <div className="pokemon-move-cost">
                <span className="energy-dot lightning"><Zap size={13} /></span>
                <span className="energy-dot lightning"><Dumbbell size={13} /></span>
              </div>
              <div className="pokemon-move-details">
                <div className="pokemon-move-name-row">
                  <span className="pokemon-move-name">Master Coaching</span>
                  <span className="pokemon-move-damage">{instructorStats?.programs || 0} PRG</span>
                </div>
                <p className="pokemon-move-desc">
                  Engineered workout plans and fitness guides for athletes across GymSync.
                </p>
              </div>
            </div>
          ) : (
            <div className="pokemon-move">
              <div className="pokemon-move-cost">
                <span className="energy-dot lightning"><Zap size={13} /></span>
                <span className="energy-dot lightning"><Zap size={13} /></span>
                <span className="energy-dot lightning"><Zap size={13} /></span>
              </div>
              <div className="pokemon-move-details">
                <div className="pokemon-move-name-row">
                  <span className="pokemon-move-name">XP Overdrive</span>
                  <span className="pokemon-move-damage">{points} XP</span>
                </div>
                <p className="pokemon-move-desc">
                  Channels all accumulated workout points, exercise repetitions, and personal best milestones.
                </p>
              </div>
            </div>
          )}

          <div className="pokemon-move-divider" />

          {/* Special Ability: Gmail Authenticated / Shield */}
          <div className="pokemon-ability">
            <div className="pokemon-ability-tag">ABILITY</div>
            <div className="pokemon-ability-content">
              <span className="pokemon-ability-title">Account Defense</span>
              <span className="pokemon-ability-status">
                {isVerified ? (
                  <span className="verified-badge"><CheckCircle2 size={13} /> Gmail Verified</span>
                ) : (
                  <span className="unverified-group">
                    <span className="unverified-badge"><AlertTriangle size={13} /> Unverified</span>
                    <button
                      type="button"
                      className="pokemon-verify-btn"
                      onClick={() => {
                        setVerifyEmailInput(userData?.email || '');
                        setIsVerifyModalOpen(true);
                      }}
                    >
                      Verify Now
                    </button>
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer: Weakness, Resistance, Retreat */}
        <div className="pokemon-card-footer">
          <div className="footer-stat">
            <span className="footer-stat-label">Weakness</span>
            <span className="footer-stat-val">Rest Day ×2</span>
          </div>
          <div className="footer-stat">
            <span className="footer-stat-label">Resistance</span>
            <span className="footer-stat-val">Fatigue -30</span>
          </div>
          <div className="footer-stat">
            <span className="footer-stat-label">Retreat Cost</span>
            <span className="footer-stat-val"><Zap size={11} /> 1</span>
          </div>
        </div>

        {/* Collector Tiny Print */}
        <div className="pokemon-card-bottom-bar">
          <span>GymSync 1st Edition • Card #GS-001 • Holographic Ultra Rare ★★★</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
