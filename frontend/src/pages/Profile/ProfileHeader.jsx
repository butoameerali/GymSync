import React, { useState } from 'react';
import { Flame, Zap, Camera, Dumbbell, Sparkles, CheckCircle2, AlertTriangle, Maximize2, X } from 'lucide-react';
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
  const [isHdModalOpen, setIsHdModalOpen] = useState(false);
  const isAdminUser = ['SuperAdmin', 'Admin', 'ComplaintModerator'].includes(userRole);
  const isVerified = Boolean(userData?.isGoogleApproved || userData?.isEmailVerified);
  const points = stats?.points || 0;
  const streak = stats?.streak || 0;
  const level = Math.max(1, Math.floor(points / 100) + 1);
  const hp = Math.max(100, points + 120);

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

      {/* Center: Hero Cutout / Photo Background Stage */}
      <div className="pokemon-card-art-stage">
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

        {/* Change Photo Overlay Button */}
        {!isHd && (
          <button 
            type="button" 
            className="pokemon-card-photo-btn"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current && fileInputRef.current.click();
            }}
            title="Upload cutout or photo"
          >
            <Camera size={13} />
            <span>Change Photo</span>
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
            title="Open HD Card Photo View"
          >
            <Maximize2 size={13} />
            <span>HD Card</span>
          </button>
        )}

        {/* Level Ribbon */}
        <div className="pokemon-card-lvl-badge">
          <Sparkles size={11} />
          <span>LVL {level}</span>
        </div>
      </div>

      {/* Sub-strip Pokedex Stats */}
      <div className="pokemon-card-substrip">
        <span>NO. 001</span>
        <span>•</span>
        <span>HT: {bio?.height || "5'10\""}</span>
        <span>•</span>
        <span>WT: {bio?.weight || "72 kg"}</span>
        <span>•</span>
        <span>{bio?.location ? bio.location : (isAdminUser ? 'Headquarters' : 'GymSync Arena')}</span>
      </div>

      {/* Floating Moves & Power Overlays */}
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

        {/* Move 2: XP / Instructor */}
        <div className="pokemon-card-move-row">
          <div className="pokemon-move-cost-pills">
            <span className="cost-orb electric"><Zap size={11} /></span>
            <span className="cost-orb electric"><Zap size={11} /></span>
          </div>
          <div className="pokemon-move-content">
            <div className="pokemon-move-title-row">
              <span className="move-title">{userRole === 'FitnessInstructor' ? 'Master Coaching' : 'XP Overdrive'}</span>
              <span className="move-power">
                {userRole === 'FitnessInstructor' ? `${instructorStats?.programs || 0} PRG` : `${points} XP`}
              </span>
            </div>
            <p className="move-desc">Accumulated sets, PR milestones, and performance output.</p>
          </div>
        </div>

        {/* Ability: Account Defense */}
        <div className="pokemon-card-ability-row">
          <span className="ability-pill">ABILITY</span>
          <span className="ability-name">Account Defense</span>
          <div className="ability-status">
            {isVerified ? (
              <span className="verified-chip"><CheckCircle2 size={11} /> Verified</span>
            ) : (
              <button 
                type="button" 
                className="verify-chip-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setVerifyEmailInput(userData?.email || '');
                  setIsVerifyModalOpen(true);
                }}
              >
                <AlertTriangle size={11} /> Verify Email
              </button>
            )}
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
      <div className="pokemon-card-wrapper">
        <div 
          className="pokemon-card-clickable-container"
          onClick={() => setIsHdModalOpen(true)}
          title="Click to view HD card image"
        >
          {renderCard(false)}
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={handlePicUpload} 
        />
      </div>

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
              <span className="pokemon-hd-hint">Click outside or press X to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileHeader;
