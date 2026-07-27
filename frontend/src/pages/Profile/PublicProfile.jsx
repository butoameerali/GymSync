import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity, Flame, MessageCircle, UserPlus, Check, X } from 'lucide-react';
import './Profile.css';

const PublicProfile = () => {
  const { userName } = useParams();
  const [stats, setStats] = useState({ points: 0, streak: 0 });
  const [userPosts, setUserPosts] = useState([]);
  
  // Scoped mock data from local storage
  const userKey = userName.replace(/\s+/g, '_');
  const profilePic = localStorage.getItem(`gymsync_${userKey}_pic`) || '';
  
  // Follow System
  const loggedInUserName = localStorage.getItem('gymsync_user_name') || 'Guest';
  const [isFollowing, setIsFollowing] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  const [publicBio, setPublicBio] = useState({});

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
    if (loggedInUserName === 'Guest') return;
    
    try {
      const endpoint = isFollowing ? '/api/users/unfollow' : '/api/users/follow';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerName: loggedInUserName, targetName: userName })
      });
      if (res.ok) {
        setIsFollowing(!isFollowing);
      }
    } catch (err) { console.error(err); }
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
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isFollowing ? <Check size={18}/> : <UserPlus size={18}/>} 
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MessageCircle size={18}/> Message</button>
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
    </div>
  );
};

export default PublicProfile;
