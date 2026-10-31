import React, { useState, useEffect } from 'react';
import { MapPin, User, Target, Building, Image as ImageIcon, Send, Award, Dumbbell, BookOpen, AlertTriangle, Clock, RotateCcw, FileText, X } from 'lucide-react';
import { toast } from 'react-toastify';
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
  loggedInUserName,
  isOwnProfile = true,
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
  const [moderatedPosts, setModeratedPosts] = useState([]);
  const [isAppealOpen, setIsAppealOpen] = useState(false);
  const [appealTextMap, setAppealTextMap] = useState({});
  const [submittingAppealId, setSubmittingAppealId] = useState(null);

  const fetchModeratedPosts = async () => {
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      if (!token) return;
      const res = await fetch('/api/posts/my-moderated', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setModeratedPosts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Error fetching moderated posts:', e);
    }
  };

  useEffect(() => {
    if (isOwnProfile) {
      fetchModeratedPosts();
    }
  }, [userName, isOwnProfile]);

  const handleSubmitAppeal = async (postId) => {
    const text = appealTextMap[postId]?.trim();
    if (!text) {
      toast.warning('Please provide an explanation for your appeal review.');
      return;
    }

    setSubmittingAppealId(postId);
    try {
      const token = localStorage.getItem('gymsync_token') || '';
      const res = await fetch(`/api/posts/${postId}/appeal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ appealReason: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit appeal');

      toast.success('Your appeal has been submitted to moderators!');
      setAppealTextMap(prev => ({ ...prev, [postId]: '' }));
      fetchModeratedPosts();
    } catch (err) {
      toast.error(err.message || 'Error submitting appeal');
    } finally {
      setSubmittingAppealId(null);
    }
  };
  return (
    <div className="profile-timeline-vertical-layout">
      {/* Top Container: Intro and Fitness Stats */}
      <div className="profile-timeline-top-section">
        <div className="glass-panel fb-intro-card">
          <h3 className="section-title" style={{ fontSize: '1.05rem', marginBottom: '10px' }}>Intro</h3>
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
              type="button"
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
              <div style={{ background: 'var(--card-bg)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary-accent)', fontWeight: 'bold', fontSize: '1.3rem' }}>{stats.points}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Points</div>
              </div>
              <div style={{ background: 'var(--card-bg)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '1.3rem' }}>{stats.streak}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Day Streak</div>
              </div>
            </div>

            {/* Photos Preview */}
            {photoPosts.length > 0 && (
              <div style={{ marginTop: '14px', borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
                <h5 style={{ fontSize: '0.86rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Recent Photos</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {photoPosts.slice(0, 4).map((p, idx) => (
                    <img key={p._id || idx} src={p.mediaUrl} alt="Timeline photo" style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                  ))}
                </div>
              </div>
            )}
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
      </div>

      {/* Feed Section: Create Post Card + Interactive PostList */}
      <div className="fb-profile-feed">
        {/* Moderation Hold & Appeal Banner (Own Profile Only) */}
        {isOwnProfile && moderatedPosts && moderatedPosts.length > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 600, fontSize: '0.95rem' }}>
                <AlertTriangle size={18} /> Community Moderation Hold ({moderatedPosts.length} Post{moderatedPosts.length === 1 ? '' : 's'})
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', fontSize: '0.78rem' }}
                onClick={() => setIsAppealOpen(!isAppealOpen)}
              >
                {isAppealOpen ? 'Hide Notice' : 'View & Submit Appeal'}
              </button>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Posts removed for community guideline reviews remain on a 15-day hold period before permanent wipeout. You can review feedback or submit a counter-appeal.
            </p>

            {isAppealOpen && (
              <div style={{ display: 'grid', gap: '12px', marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                {moderatedPosts.map(post => {
                  const daysLeft = post.appealDeadline ? Math.max(0, Math.ceil((new Date(post.appealDeadline) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
                  const purgeDaysLeft = post.finalPurgeDeadline ? Math.max(0, Math.ceil((new Date(post.finalPurgeDeadline) - new Date()) / (1000 * 60 * 60 * 24))) : 0;

                  return (
                    <div key={post._id} style={{ background: 'var(--card-bg, #111827)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                            Removal Reason: {post.moderationReason || 'Community Guidelines Violation'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {post.moderationStatus === 'AppealRejected'
                            ? `${purgeDaysLeft}d until permanent wipe`
                            : `${daysLeft}d left in 15-day hold`}
                        </span>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px', fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        "{post.content}"
                      </div>

                      {post.adminAppealReply && (
                        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '8px 10px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.8rem' }}>
                          <strong style={{ color: '#f59e0b' }}>Moderator Note:</strong> {post.adminAppealReply}
                        </div>
                      )}

                      {post.isAppealSubmitted ? (
                        <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '10px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 600 }}>Appeal Submitted — Under Review:</div>
                          <div style={{ fontSize: '0.82rem', color: '#fff', marginTop: '2px', fontStyle: 'italic' }}>
                            "{post.appealReason}"
                          </div>
                        </div>
                      ) : post.moderationStatus !== 'AppealRejected' ? (
                        <div style={{ marginTop: '8px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Submit an Appeal Review (Explain why this post complies with community guidelines):
                          </label>
                          <textarea
                            rows={2}
                            className="input-field"
                            style={{ width: '100%', fontSize: '0.82rem', marginBottom: '6px' }}
                            placeholder="Provide your explanation or context for the moderators..."
                            value={appealTextMap[post._id] || ''}
                            onChange={e => setAppealTextMap({ ...appealTextMap, [post._id]: e.target.value })}
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={submittingAppealId === post._id}
                            onClick={() => handleSubmitAppeal(post._id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <RotateCcw size={13} /> {submittingAppealId === post._id ? 'Submitting...' : 'Submit Appeal Review'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Post Card (Own Profile Only) */}
        {isOwnProfile && (
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
        )}

        {/* Facebook PostList with interactive like, comment, and replies */}
        <PostList
          posts={myPosts}
          currentUserName={loggedInUserName || userName}
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
