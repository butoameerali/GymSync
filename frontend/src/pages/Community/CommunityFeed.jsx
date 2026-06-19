import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Image as ImageIcon, Video, Send } from 'lucide-react';
import './CommunityFeed.css';

const MOCK_POSTS = [
  {
    id: 1,
    user: "Alex Fitness",
    avatar: "A",
    time: "2 hours ago",
    content: "Just hit a new PR on deadlifts! 405 lbs for 3 reps! Thanks to the new AI Trainer form correction for keeping my back straight. 💪🔥 #GymSync #Deadlift #Gains",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop",
    likes: 124,
    comments: 12,
    isLiked: false
  },
  {
    id: 2,
    user: "Sarah Jenkins",
    avatar: "S",
    time: "5 hours ago",
    content: "Morning run completed! 5km around the park using the GymSync offline tracker. The weather is perfect today. 🏃‍♀️⛅",
    image: null,
    likes: 89,
    comments: 4,
    isLiked: true
  },
  {
    id: 3,
    user: "Titan Powerhouse Gym",
    avatar: "T",
    time: "1 day ago",
    content: "🚨 NEW EQUIPMENT ALERT 🚨 We just installed 5 new squat racks and a brand new cable machine! Come check them out. Premium members get priority booking.",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1470&auto=format&fit=crop",
    likes: 256,
    comments: 34,
    isLiked: false
  }
];

const CommunityFeed = () => {
  const [posts, setPosts] = useState(MOCK_POSTS);

  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';

  const toggleLike = (id) => {
    if (isGuest) {
      alert("Please create an account to interact with posts!");
      return;
    }
    setPosts(posts.map(post => {
      if (post.id === id) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
  };

  return (
    <div className="community-page">
      <div className="container feed-container">
        
        {/* Left Sidebar (Friends/Gyms) */}
        <div className="feed-sidebar left-sidebar">
          <div className="glass-panel sidebar-widget">
            <h3>Your Network</h3>
            <ul className="network-list">
              <li><div className="avatar small">M</div> Mike (Active Now)</li>
              <li><div className="avatar small">J</div> Jessica (2h ago)</li>
              <li><div className="avatar small">D</div> David (Online)</li>
            </ul>
            <button className="btn btn-outline btn-sm w-100" style={{marginTop: '15px'}} onClick={() => { if(isGuest) alert("Guests cannot add friends."); }}>Find Friends</button>
          </div>
        </div>

        {/* Main Feed */}
        <div className="main-feed">
          
          {/* Create Post Box */}
          <div className="create-post-box glass-panel">
            <div className="create-post-header">
              <div className="avatar">{isGuest ? '?' : 'Y'}</div>
              <input 
                type="text" 
                placeholder={isGuest ? "Log in to share your workout..." : "Share your workout, progress, or thoughts..."} 
                className="post-input"
                disabled={isGuest}
              />
            </div>
            <div className="create-post-actions">
              <div className="action-buttons">
                <button className="post-action-btn" disabled={isGuest}><ImageIcon size={18}/> Photo</button>
                <button className="post-action-btn" disabled={isGuest}><Video size={18}/> Video</button>
              </div>
              <button className="btn btn-primary btn-sm" disabled={isGuest} onClick={() => { if(!isGuest) alert("Post created!"); }}><Send size={16}/> Post</button>
            </div>
          </div>

          {/* Posts Feed */}
          {posts.map(post => (
            <div key={post.id} className="post-card glass-panel">
              <div className="post-header">
                <div className="post-user-info">
                  <div className="avatar">{post.avatar}</div>
                  <div>
                    <h4>{post.user}</h4>
                    <span className="post-time">{post.time}</span>
                  </div>
                </div>
                <button className="options-btn">•••</button>
              </div>
              
              <div className="post-content">
                <p>{post.content}</p>
                {post.image && (
                  <div className="post-image">
                    <img src={post.image} alt="Post content" />
                  </div>
                )}
              </div>
              
              <div className="post-actions">
                <button 
                  className={`action-btn ${post.isLiked ? 'liked' : ''}`}
                  onClick={() => toggleLike(post.id)}
                >
                  <Heart size={20} fill={post.isLiked ? "#ef4444" : "none"} color={post.isLiked ? "#ef4444" : "currentColor"} />
                  {post.likes}
                </button>
                <button className="action-btn">
                  <MessageCircle size={20} />
                  {post.comments}
                </button>
                <button className="action-btn">
                  <Share2 size={20} />
                  Share
                </button>
                <button className="action-btn save-btn">
                  <Bookmark size={20} />
                </button>
              </div>
            </div>
          ))}

        </div>

        {/* Right Sidebar (Challenges/Ads) */}
        <div className="feed-sidebar right-sidebar">
          <div className="glass-panel sidebar-widget ad-widget">
            <span className="sponsored-tag">Sponsored</span>
            <img src="https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=1470&auto=format&fit=crop" alt="Protein Ad" className="ad-image"/>
            <h4>Optimum Nutrition Gold Standard</h4>
            <p>Get 20% off exclusively on the GymSync Store!</p>
            <button className="btn btn-primary btn-sm w-100">Shop Now</button>
          </div>

          <div className="glass-panel sidebar-widget challenge-widget">
            <h3>Weekly Challenge</h3>
            <div className="challenge-icon">🔥</div>
            <h4>10k Steps Daily</h4>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{width: '60%'}}></div>
            </div>
            <p>3 days left</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CommunityFeed;
