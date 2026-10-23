import React, { useState, useRef } from 'react';
import { Flame, Zap, Camera, Dumbbell, Sparkles, Trophy } from 'lucide-react';
import UserAvatar from '../../components/common/UserAvatar';

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
}) => {
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});
  const [glareStyle, setGlareStyle] = useState({});

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

  // 3D Card Tilt Interaction (Desktop)
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

  return (
    <div className="pokemon-card-wrapper">
      <div 
        className="pokemon-fullart-card athlete-3d-card"
        ref={cardRef}
        style={tiltStyle}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Holographic Rainbow Foil Sheen */}
        <div className="pokemon-card-holo-sheen" style={glareStyle} />

        {/* Top Header Bar */}
        <div className="pokemon-card-top-bar">
          <div className="pokemon-card-header-main">
            <div className="pokemon-stage-badge">
              <span className="stage-tag">ATHLETE</span>
              <span className="stage-sep">•</span>
              <span className="stage-role">{userRole || 'Member'}</span>
            </div>
            <h2 className="pokemon-card-name" title={userName}>{userName}</h2>
          </div>

          <div className="pokemon-card-top-controls">
            <div className="pokemon-power-badge" title="Athlete Power Level">
              <span className="power-label">PWR</span>
              <span className="power-val">{powerScore}</span>
              <Zap size={13} className="power-icon" />
            </div>

            {/* Small top-right edit option to edit profile pic */}
            <button 
              type="button" 
              className="pokemon-card-top-edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current && fileInputRef.current.click();
              }}
              title="Edit photo"
              aria-label="Edit photo"
            >
              <Camera size={14} />
            </button>
          </div>
        </div>

        {/* Center: Character Art Frame with Pop-Out Hero Artwork */}
        <div className="pokemon-card-art-frame athlete-art-frame">
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
              <UserAvatar src="" name={userName} size={120} />
            </div>
          )}

          {/* Level Ribbon Badge */}
          <div className="pokemon-card-lvl-badge">
            <Sparkles size={12} />
            <span>LEVEL {level}</span>
          </div>
        </div>

        {/* Sub-strip: Real Measurements (Height, Weight, Location) */}
        <div className="pokemon-card-substrip">
          <span className="substrip-item"><strong className="substrip-label">HEIGHT:</strong> {heightVal}</span>
          <span className="substrip-bullet">•</span>
          <span className="substrip-item"><strong className="substrip-label">WEIGHT:</strong> {weightVal}</span>
          {bio?.location && (
            <>
              <span className="substrip-bullet">•</span>
              <span className="substrip-item card-substrip-location">{bio.location}</span>
            </>
          )}
        </div>

        {/* Real Athletic Metrics */}
        <div className="pokemon-card-moves">
          {/* Metric 1: Streak */}
          <div className="pokemon-card-move-row">
            <div className="pokemon-move-cost-pills">
              <span className="cost-orb fire"><Flame size={13} /></span>
            </div>
            <div className="pokemon-move-content">
              <div className="pokemon-move-title-row">
                <span className="move-title">Workout Streak</span>
                <span className="move-power">{streak} DAYS</span>
              </div>
              <p className="move-desc">Current active consecutive workout streak</p>
            </div>
          </div>

          {/* Metric 2: Completed Exercises */}
          <div className="pokemon-card-move-row">
            <div className="pokemon-move-cost-pills">
              <span className="cost-orb steel"><Dumbbell size={13} /></span>
            </div>
            <div className="pokemon-move-content">
              <div className="pokemon-move-title-row">
                <span className="move-title">Total Exercises</span>
                <span className="move-power">{totalExercises}</span>
              </div>
              <p className="move-desc">Total completed exercises logged</p>
            </div>
          </div>

          {/* Metric 3: Total XP & Seniority */}
          <div className="pokemon-card-move-row">
            <div className="pokemon-move-cost-pills">
              <span className="cost-orb electric"><Trophy size={13} /></span>
            </div>
            <div className="pokemon-move-content">
              <div className="pokemon-move-title-row">
                <span className="move-title">Total Points</span>
                <span className="move-power">{points.toLocaleString()} XP</span>
              </div>
              <p className="move-desc">Member Since: {joinDate} • Tier Level {level}</p>
            </div>
          </div>
        </div>

        {/* Authentic Collectible Card Footer */}
        <div className="pokemon-card-bottom">
          <div className="card-weakness-bar">
            <span>GymSync Athlete</span>
            <span>•</span>
            <span>Member Since {joinDate}</span>
          </div>
          <div className="card-collector-code">
            GS-ATHLETE • OFFICIAL COLLECTIBLE • ACTIVE STATUS
          </div>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        style={{ display: 'none' }} 
        onChange={handlePicUpload} 
      />
    </div>
  );
};

export default ProfileHeader;
