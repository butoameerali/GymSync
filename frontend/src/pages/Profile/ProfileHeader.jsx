import React from 'react';
import { Activity, Flame, MapPin, Camera, Shield, Dumbbell, BookOpen, Award } from 'lucide-react';
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

  return (
    <div className="profile-header glass-panel">
      <div
        className="profile-avatar avatar-clickable"
        style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', padding: 0 }}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        title="Change Profile Picture"
      >
        <UserAvatar src={profilePic} name={userName} size={120} style={{ width: '100%', height: '100%', borderRadius: '50%', boxShadow: 'none' }} />
        <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', borderRadius: '50%' }}>
          <Camera color="white" size={28} />
        </div>
      </div>
      <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handlePicUpload} />

      <div className="profile-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{userName}</h1>
          <span className="category-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
            {userRole}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
          <p className="bio-tagline" style={{ margin: 0 }}>
            {bio.location ? <><MapPin size={16}/> {bio.location}</> : 'Fitness Enthusiast'}
          </p>
          {userData?.isGoogleApproved || userData?.isEmailVerified ? (
            <span className="category-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
              ✅ Gmail Verified
            </span>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="category-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
                ⚠️ Gmail Verification Pending
              </span>
              <button
                className="btn btn-primary btn-sm"
                style={{ padding: '3px 10px', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981', borderRadius: '12px', cursor: 'pointer' }}
                onClick={() => { setVerifyEmailInput(userData?.email || ''); setIsVerifyModalOpen(true); }}
              >
                Verify Email Now
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="profile-stats">
        {isTrainee ? (
          <>
            <div className="stat-badge pulse-blue">
              <Activity size={20} />
              <span>{stats.points} Pts</span>
            </div>
            <div className="stat-badge pulse-orange">
              <Flame size={20} />
              <span>{stats.streak} Days</span>
            </div>
          </>
        ) : userRole === 'FitnessInstructor' ? (
          <>
            <div className="stat-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid #3b82f6' }}>
              <Award size={18} />
              <span>Certified Instructor</span>
            </div>
            <div className="stat-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981' }}>
              <Dumbbell size={18} />
              <span>{instructorStats.programs} Programs</span>
            </div>
            <div className="stat-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid #f59e0b' }}>
              <BookOpen size={18} />
              <span>{instructorStats.articles} Guides</span>
            </div>
          </>
        ) : (
          <div className="stat-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid #3b82f6' }}>
            <Shield size={18} />
            <span>{userRole}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
