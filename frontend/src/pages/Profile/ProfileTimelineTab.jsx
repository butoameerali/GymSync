import React from 'react';
import { MapPin, User, Target, Building, Image as ImageIcon, Send, Award, Dumbbell, BookOpen } from 'lucide-react';
import UserAvatar from '../../components/common/UserAvatar';
import PostList from '../../features/social/components/PostList';

const ProfileTimelineTab = ({
  bio,
  userRole,
  isAdminUser,
  isTrainee,
  hideHealthData,
  stats,
  instructorStats,
  photoPosts,
  profilePic,
  userName,
  myPosts,
  newPostText,
  setNewPostText,
  selectedPostFile,
  setSelectedPostFile,
  postFileInputRef,
  isPublishingPost,
  handleCreateProfilePost,
  handleLikePost,
  handleAddComment,
  handleDeleteComment,
  handleAddReply,
  handleDeleteReply,
}) => {
  return (
    <div className="fb-profile-layout">
      {/* Left Column: Intro, Stats, Photos */}
      <div className="fb-profile-sidebar">
        <div className="glass-panel fb-intro-card">
          <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Intro</h3>
          <p className="fb-bio-text">
            {bio.fitnessGoals || (userRole === 'GymTrainer' ? 'Certified Gym Trainer & Fitness Coach' : userRole === 'GymOwner' ? 'Gym Owner & Facility Partner' : isAdminUser ? 'GymSync Platform Administrator' : 'GymSync Community Member')}
          </p>
          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
            {bio.location && (
              <div className="fb-intro-item"><MapPin size={16} color="var(--primary-accent)" /> Lives in <strong>{bio.location}</strong></div>
            )}
            <div className="fb-intro-item"><User size={16} color="var(--primary-accent)" /> Role: <strong>{userRole}</strong></div>
            {bio.mainGoalArea && (
              <div className="fb-intro-item"><Target size={16} color="#10b981" /> Path: <strong>{bio.mainGoalArea}</strong></div>
            )}
            {bio.equipmentAccess && (
              <div className="fb-intro-item"><Building size={16} color="#f59e0b" /> Access: <strong>{bio.equipmentAccess}</strong></div>
            )}
            {!hideHealthData && bio.height && (
              <div className="fb-intro-item">📏 Height: <strong>{bio.height} {bio.units === 'imperial' ? 'in' : 'cm'}</strong></div>
            )}
            {!hideHealthData && bio.weight && (
              <div className="fb-intro-item">⚖️ Weight: <strong>{bio.weight} {bio.units === 'imperial' ? 'lbs' : 'kg'}</strong></div>
            )}
          </div>
          {isTrainee && (
            <button
              className="btn btn-outline btn-sm"
              style={{ width: '100%', marginTop: '14px' }}
              onClick={() => {
                localStorage.setItem('gymsync_onboarding_skip_date', '');
                window.dispatchEvent(new Event('open-onboarding'));
              }}
            >
              Edit Bio / Assessment
            </button>
          )}
        </div>

        {/* Badges / Stats */}
        {isTrainee && (
          <div className="glass-panel fb-intro-card">
            <h4 className="section-title" style={{ fontSize: '1rem', marginBottom: '12px' }}>Fitness Stats</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary-accent)', fontWeight: 'bold', fontSize: '1.2rem' }}>{stats.points}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Points</div>
              </div>
              <div style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '1.2rem' }}>{stats.streak}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Day Streak</div>
              </div>
            </div>
          </div>
        )}

        {userRole === 'FitnessInstructor' && (
          <div className="glass-panel fb-intro-card">
            <h4 className="section-title" style={{ fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={16} color="var(--primary-accent)" /> Instructor Portfolio
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary-accent)', fontWeight: 'bold', fontSize: '1.2rem' }}>{instructorStats.programs}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Programs Authored</div>
              </div>
              <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>{instructorStats.diets}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Diet Templates</div>
              </div>
              <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.2rem' }}>{instructorStats.articles}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Published Guides</div>
              </div>
              <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '1.2rem' }}>{instructorStats.tasksCompleted}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tasks Completed</div>
              </div>
            </div>
          </div>
        )}

        {/* Photos Preview */}
        {photoPosts.length > 0 && (
          <div className="glass-panel fb-intro-card">
            <h4 className="section-title" style={{ fontSize: '1rem', marginBottom: '12px' }}>Photos</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {photoPosts.map((p, idx) => (
                <img key={p._id || idx} src={p.mediaUrl} alt="Timeline photo" style={{ width: '100%', height: '75px', objectFit: 'cover', borderRadius: '8px' }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Create Post Card + Interactive PostList */}
      <div className="fb-profile-feed">
        {/* Create Post Card */}
        <div className="glass-panel fb-create-post-card">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="fb-feed-avatar" style={{ overflow: 'hidden' }}>
              <UserAvatar src={profilePic} name={userName} size={40} />
            </div>
            <input
              type="text"
              className="fb-post-input"
              placeholder={`What's on your fitness mind, ${userName.split(' ')[0]}?`}
              value={newPostText}
              onChange={e => setNewPostText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleCreateProfilePost(e); }}
            />
          </div>

          {selectedPostFile && (
            <div className="fb-media-preview">
              <span>Attached: {selectedPostFile.name}</span>
              <button type="button" onClick={() => { setSelectedPostFile(null); if (postFileInputRef.current) postFileInputRef.current.value = null; }}>Remove</button>
            </div>
          )}

          <div className="fb-post-actions-bar">
            <label className="fb-upload-btn">
              <ImageIcon size={18} color="#10b981" />
              <span>Photo / Video</span>
              <input
                type="file"
                ref={postFileInputRef}
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedPostFile(e.target.files[0]);
                  }
                }}
              />
            </label>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreateProfilePost}
              disabled={isPublishingPost}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={14} />
              {isPublishingPost ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>

        {/* Facebook PostList with interactive like, comment, and replies */}
        <PostList
          posts={myPosts}
          currentUserName={userName}
          userRole={userRole}
          onLike={handleLikePost}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onAddReply={handleAddReply}
          onDeleteReply={handleDeleteReply}
        />
      </div>
    </div>
  );
};

export default ProfileTimelineTab;
