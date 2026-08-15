import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity, Flame, MessageCircle, UserPlus, Check, X, ThumbsUp, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import './Profile.css';

const PublicProfile = () => {
  const { userName } = useParams();
  const [stats, setStats] = useState({ points: 0, streak: 0 });
  const [userPosts, setUserPosts] = useState([]);
  
  // Post Interaction States
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [reportPostId, setReportPostId] = useState(null);
  const [reportReason, setReportReason] = useState('Inappropriate Content');
  const [reportExplanation, setReportExplanation] = useState('');

  // Scoped mock data from local storage
  const userKey = userName.replace(/\s+/g, '_');
  const profilePic = localStorage.getItem(`gymsync_${userKey}_pic`) || '';
  
  // Follow System
  const loggedInUserName = localStorage.getItem('gymsync_user_name') || 'Guest';
  const authHeaders = localStorage.getItem('gymsync_token')
    ? { Authorization: `Bearer ${localStorage.getItem('gymsync_token')}` }
    : {};
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  const [publicBio, setPublicBio] = useState({});

  const toggleLike = async (id) => {
    // Optimistic UI Update
    setUserPosts(prevPosts => prevPosts.map(post => {
      if (post._id === id) {
        const isLiked = post.likes.includes(loggedInUserName);
        const newLikes = isLiked 
          ? post.likes.filter(n => n !== loggedInUserName) 
          : [...post.likes, loggedInUserName];
          
        return { ...post, likes: newLikes };
      }
      return post;
    }));

    try {
      await fetch(`/api/posts/${id}/like`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders }
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Pull stats from local storage for the specified user
    const mockPoints = localStorage.getItem(`gymsync_${userKey}_points`) || Math.floor(Math.random() * 50);
    const mockStreak = localStorage.getItem(`gymsync_${userKey}_streak`) || Math.floor(Math.random() * 5);
    setStats({ points: parseInt(mockPoints), streak: parseInt(mockStreak) });

    const loadBio = () => {
      const stored = localStorage.getItem(`gymsync_${userKey}_bio_data`) || localStorage.getItem(`gymsync_${userKey}_bio`);
      if (stored) {
        try { setPublicBio(JSON.parse(stored)); } catch (e) {}
      }
    };
    loadBio();

    window.addEventListener('gymsync_bio_updated', loadBio);

    // Fetch posts and filter for this user
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) {
          setUserPosts(data.filter(p => p.authorName === userName || p.author?.name === userName));
        }
      })
      .catch(err => console.error(err));

    // Fetch MongoDB User Data for Follow System
    if (loggedInUserName !== 'Guest') {
      fetch(`/api/users/${loggedInUserName}`)
        .then(res => res.json())
        .then(me => {
          if (me.following?.includes(userName)) setIsFollowing(true);
          else setIsFollowing(false);
        })
        .catch(err => console.error(err));
        
      fetch(`/api/users/${userName}`)
        .then(res => res.json())
        .then(them => setTargetUser(them))
        .catch(err => console.error(err));
    }

    return () => {
      window.removeEventListener('gymsync_bio_updated', loadBio);
    };
  }, [userName, userKey, loggedInUserName]);

  const handleFollowToggle = async () => {
    if (loggedInUserName === 'Guest' || isFollowPending) return;
    
    const previousState = isFollowing;
    const previousTargetUser = targetUser;
    
    // 1. Optimistic UI Update
    const newFollowingState = !previousState;
    setIsFollowing(newFollowingState);
    setIsFollowPending(true);

    setTargetUser(prev => {
      if (!prev) return prev;
      const followers = prev.followers || [];
      const updatedFollowers = newFollowingState
        ? (followers.includes(loggedInUserName) ? followers : [...followers, loggedInUserName])
        : followers.filter(name => name !== loggedInUserName);
      return { ...prev, followers: updatedFollowers };
    });
    
    try {
      const endpoint = previousState ? '/api/users/unfollow' : '/api/users/follow';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ followerName: loggedInUserName, targetName: userName })
      });
      if (!res.ok) {
        setIsFollowing(previousState); // Revert on failure
        setTargetUser(previousTargetUser);
        if (toast && toast.error) toast.error(`Action failed. Rolled back state.`);
      }
    } catch (err) { 
      console.error(err); 
      setIsFollowing(previousState); // Revert on failure
      setTargetUser(previousTargetUser);
      if (toast && toast.error) toast.error(`Network error. Rolled back state.`);
    } finally {
      setIsFollowPending(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-cover"></div>
      <div className="container">
        <div className="profile-header glass-panel">
          <div className="profile-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profilePic ? (
              <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="profile-info">
            <h1>{userName}</h1>
            <p className="bio-tagline">{targetUser?.followers?.length || 0} Followers</p>
          </div>
          <div className="profile-stats">
            <div className="stat-badge pulse-blue">
              <Activity size={20} />
              <span>{stats.points} Pts</span>
            </div>
            <div className="stat-badge pulse-orange">
              <Flame size={20} />
              <span>{stats.streak} Days</span>
            </div>
          </div>
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            {loggedInUserName !== 'Guest' && loggedInUserName !== userName && (
              <button 
                className={`btn ${isFollowing ? 'btn-outline' : 'btn-primary'}`} 
                onClick={handleFollowToggle} 
                disabled={isFollowPending}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isFollowPending ? 0.75 : 1, cursor: isFollowPending ? 'not-allowed' : 'pointer' }}
              >
                {isFollowPending ? <Loader2 size={18} className="animate-spin" /> : isFollowing ? <Check size={18}/> : <UserPlus size={18}/>} 
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            <button 
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => {
                if (loggedInUserName === 'Guest') return;
                window.dispatchEvent(new CustomEvent('open_chat', { detail: { userName } }));
              }}
            >
              <MessageCircle size={18}/> Message
            </button>
          </div>
        </div>

        <div className="profile-content">
          <div className="timeline-grid" style={{ gridColumn: '1/-1' }}>
            
            {/* Public Bio Section */}
            <h3 style={{ marginBottom: '15px' }}>About {userName}</h3>
            <div className="glass-panel section-panel" style={{ marginBottom: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '5px' }}>Height</p>
                  <p style={{ fontWeight: 'bold' }}>
                    {localStorage.getItem('gymsync_privacy_hideHealth') === 'true' ? '🔒 Private' : (publicBio.height ? `${publicBio.height} ${publicBio.units === 'metric' ? 'cm' : 'in'}` : 'Not set')}
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '5px' }}>Weight</p>
                  <p style={{ fontWeight: 'bold' }}>
                    {localStorage.getItem('gymsync_privacy_hideHealth') === 'true' ? '🔒 Private' : (publicBio.weight ? `${publicBio.weight} ${publicBio.units === 'metric' ? 'kg' : 'lbs'}` : 'Not set')}
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '5px' }}>Goals</p>
                  <p style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {publicBio.mainGoalArea || publicBio.fitnessGoals?.replace('_', ' ') || 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            <h3 style={{ marginBottom: '15px' }}>{userName}'s Posts</h3>
            {userPosts.length > 0 ? (
              userPosts.map(post => (
                <div key={post._id} className="glass-panel post-card" style={{ marginBottom: '15px' }}>
                  <div className="post-header">
                    <div className="avatar" style={{ overflow: 'hidden' }}>
                      {profilePic ? <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4>{userName}</h4>
                      <span className="time">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="post-content">{post.content}</p>
                  {post.mediaUrl && (
                    <img src={`${post.mediaUrl}`} alt="Post" style={{ width: '100%', borderRadius: '12px', marginTop: '10px' }} />
                  )}
                  
                  <div className="post-actions" style={{ display: 'flex', gap: '15px', marginTop: '15px', color: 'var(--text-secondary)' }}>
                    <button 
                      className={`action-btn ${post.likes?.includes(loggedInUserName) ? 'active' : ''}`}
                      onClick={() => toggleLike(post._id)}
                      style={{ background: 'none', border: 'none', color: post.likes?.includes(loggedInUserName) ? '#3b82f6' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ThumbsUp size={18} /> {post.likes?.length || 0}
                    </button>
                    <button 
                      className="action-btn" 
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post._id ? null : post._id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <MessageCircle size={18} /> {post.comments?.length || 0}
                    </button>
                    <button 
                      className="action-btn" 
                      style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Report post to moderators"
                      onClick={() => setReportPostId(post._id)}
                    >
                      <AlertTriangle size={18} /> Report
                    </button>
                  </div>

                  {/* Comments Section */}
                  {activeCommentPostId === post._id && (
                    <div className="comments-section" style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <input 
                          type="text" 
                          placeholder="Write a comment..." 
                          className="search-input"
                          style={{ flex: 1, padding: '10px', borderRadius: '20px' }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && e.target.value.trim() !== '') {
                              const val = e.target.value;
                              e.target.value = '';
                              try {
                                const res = await fetch(`/api/posts/${post._id}/comment`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', ...authHeaders },
                                  body: JSON.stringify({ text: val })
                                });
                                const updatedComments = await res.json();
                                setUserPosts(userPosts.map(p => p._id === post._id ? { ...p, comments: updatedComments } : p));
                                toast.success("Comment added!");
                              } catch (err) { toast.error("Failed to add comment."); }
                            }
                          }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {post.comments && post.comments.map((c) => (
                          <div key={c._id || Math.random()} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{c.author || 'User'}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{c.date ? new Date(c.date).toLocaleDateString() : ''}</span>
                            </div>
                            <p style={{ fontSize: '0.9rem', margin: 0 }}>{c.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="glass-panel section-panel">
                <p className="empty-text">{userName} hasn't posted anything yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Post Report Modal */}
      <Modal isOpen={Boolean(reportPostId)} onClose={() => setReportPostId(null)} title="Report Community Post">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!reportPostId) return;
          try {
            const res = await fetch(`/api/posts/${reportPostId}/report`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders },
              body: JSON.stringify({ 
                reason: reportReason, 
                explanation: reportExplanation 
              })
            });
            if (res.ok) {
              toast.info('Post reported to GymSync moderators for review.');
              setReportPostId(null);
              setReportReason('Inappropriate Content');
              setReportExplanation('');
            }
          } catch (err) {
            toast.error('Failed to report post');
          }
        }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Please let us know why you are reporting this post.
          </p>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Reason</label>
            <select 
              className="search-input"
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
            >
              <option value="Inappropriate Content">Inappropriate Content (Nudity, Violence)</option>
              <option value="Spam or Scam">Spam, Scam, or Misleading</option>
              <option value="Harassment">Harassment or Hate Speech</option>
              <option value="Self Harm">Encouraging Self Harm / Dangerous Fitness Advice</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Additional Details (Optional)</label>
            <textarea 
              className="search-input"
              placeholder="Provide any additional context..."
              value={reportExplanation}
              onChange={e => setReportExplanation(e.target.value)}
              rows="3"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', resize: 'none' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}>
            <AlertTriangle size={16} /> Submit Report
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default PublicProfile;
