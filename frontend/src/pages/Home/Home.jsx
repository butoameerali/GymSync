import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon, Video, Send, ThumbsUp, MessageCircle, X, Edit2, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../../components/common/Modal';
import './Home.css';

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [globalUsers, setGlobalUsers] = useState({});
  const fileInputRef = useRef(null);
  
  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';
  const isTrainee = userRole === 'User' || userRole === 'user' || isGuest;
  const isAdmin = userRole === 'Admin' || userRole === 'SuperAdmin' || userRole === 'ComplaintModerator';
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const authHeaders = {
    ...(localStorage.getItem('gymsync_token')
      ? { Authorization: `Bearer ${localStorage.getItem('gymsync_token')}` }
      : {})
  };

  const [feedTab, setFeedTab] = useState('global');
  const [currentUser, setCurrentUser] = useState(null);

  // Admin Post Removal Modal State
  const [removalPostId, setRemovalPostId] = useState(null);
  const [removalReason, setRemovalReason] = useState('Violation of community guidelines');

  // User Post Report Modal State
  const [reportPostId, setReportPostId] = useState(null);
  const [reportReason, setReportReason] = useState('Inappropriate Content');
  const [reportExplanation, setReportExplanation] = useState('');

  // Fetch dynamic DB data on mount
  useEffect(() => {
    if (!isGuest) {
      fetch(`/api/users/${userName}`)
        .then(res => res.json())
        .then(user => setCurrentUser(user))
        .catch(err => console.error("Error fetching user data:", err));
    }

    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) setPosts(data);
      })
      .catch(err => console.error("Error fetching posts:", err));
      
    // Fetch global users for synced profile pictures
    fetch('/api/users')
      .then(res => res.json())
      .then(users => {
        const userMap = {};
        users.forEach(u => userMap[u.name] = u.profilePic);
        setGlobalUsers(userMap);
      })
      .catch(err => console.error(err));

    fetch('/api/suggestions')
      .then(res => res.json())
      .then(data => setSuggestions(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching suggestions:", err));
  }, [userName, isGuest]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleCreatePost = async () => {
    if (isGuest) {
      toast.error("Guests cannot post. Please log in.");
      return;
    }
    if (!newPost.trim() && !selectedFile) return;

    const formData = new FormData();
    formData.append('content', newPost);
    if (selectedFile) {
      formData.append('media', selectedFile);
    }

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: authHeaders,
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to post");
      }
      
      const createdPost = await res.json();
      
      // The backend fallback author might be '666...'. Let's override it visually for the FYP demo instantly.
      createdPost.author = { name: userName, role: userRole };
      
      setPosts([createdPost, ...posts]);
      setNewPost('');
      setSelectedFile(null);
      toast.success("Post published to Timeline!");
    } catch (err) {
      toast.error(err.message || "Error creating post");
      console.error(err);
    }
  };

  const toggleLike = async (id) => {
    if (isGuest) {
      toast.error("Guests cannot like posts.");
      return;
    }
    
    // Optimistic UI Update
    setPosts(prevPosts => prevPosts.map(post => {
      if (post._id === id) {
        const likes = Array.isArray(post.likes) ? post.likes : [];
        const isLiked = likes.includes(userName);
        const newLikes = isLiked 
          ? likes.filter(n => n !== userName) 
          : [...likes, userName];
          
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
      toast.error("Failed to like post");
    }
  };

  // Split suggestions to left and right columns
  const leftAds = suggestions.slice(0, Math.ceil(suggestions.length / 2));
  const rightAds = suggestions.slice(Math.ceil(suggestions.length / 2));

  return (
    <div className="home-page">
      <div className="container feed-container" style={!isTrainee ? { display: 'block', maxWidth: '800px', margin: '0 auto' } : {}}>
        
        {/* Left Sidebar (Ads/Suggestions) - Trainee Only */}
        {isTrainee && (
          <div className="feed-sidebar">
            {leftAds.map(ad => (
              <div key={ad._id} className="glass-panel sidebar-widget ad-widget">
                <h4>Suggested {ad.type}</h4>
                <p className="ad-title">{ad.title}</p>
                <p className="ad-desc">{ad.description}</p>
                <button className="btn btn-outline btn-sm w-100 mt-10">View details</button>
              </div>
            ))}

            <div className="glass-panel sidebar-widget ad-widget" style={{ marginTop: '15px' }}>
              <h4>🛒 GymSync Store Deals</h4>
              <div style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '8px', marginBottom: '10px', textAlign: 'center' }}>
                 <img src="https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=1470&auto=format&fit=crop" alt="Whey" style={{width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px'}} />
                 <p style={{ fontWeight: 'bold', marginTop: '10px' }}>Gold Standard Whey</p>
                 <p style={{ color: '#10b981' }}>$64.99</p>
              </div>
              <button className="btn btn-primary btn-sm w-100 mt-10" onClick={() => window.location.href='/store'}>Shop Now</button>
            </div>
          </div>
        )}

        {/* Center Main Feed */}
        <div className="main-feed">
          
          {/* Feed Tabs */}
          {!isGuest && (
            <div className="feed-tabs glass-panel" style={{ display: 'flex', marginBottom: '15px', borderRadius: '12px', overflow: 'hidden' }}>
              <button 
                className={`feed-tab-btn ${feedTab === 'global' ? 'active' : ''}`}
                onClick={() => setFeedTab('global')}
                style={{ flex: 1, padding: '15px', background: feedTab === 'global' ? 'var(--card-bg)' : 'transparent', border: 'none', borderBottom: feedTab === 'global' ? '2px solid var(--primary-accent)' : '2px solid transparent', color: feedTab === 'global' ? 'var(--primary-accent)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Global Feed
              </button>
              <button 
                className={`feed-tab-btn ${feedTab === 'following' ? 'active' : ''}`}
                onClick={() => setFeedTab('following')}
                style={{ flex: 1, padding: '15px', background: feedTab === 'following' ? 'var(--card-bg)' : 'transparent', border: 'none', borderBottom: feedTab === 'following' ? '2px solid var(--primary-accent)' : '2px solid transparent', color: feedTab === 'following' ? 'var(--primary-accent)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Following
              </button>
            </div>
          )}

          <div className="create-post-box glass-panel">
            <div className="create-post-header">
              <div className="avatar">{isGuest ? '?' : userName.charAt(0).toUpperCase()}</div>
              <input 
                type="text" 
                placeholder={isGuest ? "Log in to share your workout..." : "Share your workout, progress, or thoughts..."} 
                className="post-input"
                disabled={isGuest}
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
              />
            </div>
            
            {/* File Preview */}
            {selectedFile && (
              <div style={{ margin: '10px 20px', padding: '10px', background: 'var(--card-bg)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--primary-accent)' }}>📎 {selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
              </div>
            )}

            <div className="create-post-actions">
              <div className="action-buttons">
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileSelect}
                />
                <button className="post-action-btn" disabled={isGuest} onClick={() => fileInputRef.current.click()}><ImageIcon size={18}/> Photo / Video</button>
              </div>
              <button className="btn btn-primary btn-sm" disabled={isGuest} onClick={handleCreatePost}><Send size={16}/> Post</button>
            </div>
          </div>

          <div className="feed-posts">
            {(Array.isArray(posts) ? posts : []).filter(post => {
              if (feedTab === 'global') return true;
              const postAuthor = post.authorName || post.author?.name;
              return currentUser?.following?.includes(postAuthor) || postAuthor === userName;
            }).map(post => (
              <div key={post._id} className="post-card glass-panel">
                <div className="post-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="avatar" style={{ overflow: 'hidden' }}>
                      {globalUsers[post.authorName || post.author?.name] ? (
                        <img src={globalUsers[post.authorName || post.author?.name]} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        post.author?.name?.charAt(0).toUpperCase() || post.authorName?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="post-meta">
                      <h4>
                        <Link to={post.authorName === userName ? '/profile' : `/profile/${post.authorName || post.author?.name}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                          {post.authorName || post.author?.name || 'Unknown User'}
                        </Link>
                        <span className="role-badge">{post.authorRole || post.author?.role || 'user'}</span>
                      </h4>
                      <span className="post-time">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Delete Button (Only for author or admin) */}
                  {(post.authorName === userName || userRole === 'admin') && (
                    <button 
                      onClick={async () => {
                        if(window.confirm('Are you sure you want to delete this post?')) {
                          try {
                            const res = await fetch(`/api/posts/${post._id}`, { method: 'DELETE', headers: authHeaders });
                            if (res.ok) {
                              setPosts(posts.filter(p => p._id !== post._id));
                              toast.success("Post deleted.");
                            }
                          } catch (err) { toast.error("Failed to delete post"); }
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}
                      title="Delete Post"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                
                <div className="post-content">
                  <p>{post.content}</p>
                  {post.mediaUrl && (
                    <img 
                      src={`${post.mediaUrl}`} 
                      alt="Post Media" 
                      style={{ width: '100%', borderRadius: '12px', marginTop: '10px', maxHeight: '500px', objectFit: 'cover', cursor: 'pointer' }} 
                      onClick={() => setSelectedImage(`${post.mediaUrl}`)}
                    />
                  )}
                </div>
                
                <div className="post-actions">
                  {!isAdmin ? (
                    <>
                      <button 
                        className={`action-btn ${post.likes.length > 0 ? 'active' : ''}`}
                        onClick={() => toggleLike(post._id)}
                      >
                        <ThumbsUp size={18} /> {post.likes.length}
                      </button>
                      <button className="action-btn" onClick={() => setActiveCommentPostId(activeCommentPostId === post._id ? null : post._id)}>
                        <MessageCircle size={18} /> {post.comments?.length || 0}
                      </button>
                      <button 
                        className="action-btn" 
                        style={{ color: '#f59e0b' }}
                        title="Report post to moderators"
                        onClick={() => setReportPostId(post._id)}
                      >
                        <AlertTriangle size={18} /> Report
                      </button>
                    </>
                  ) : (
                    <button 
                      className="action-btn" 
                      style={{ color: '#ef4444', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 14px', borderRadius: '8px' }}
                      onClick={() => setRemovalPostId(post._id)}
                    >
                      <Trash2 size={16} /> Remove Post (Admin)
                    </button>
                  )}
                </div>
                
                {/* Comment Section Dropdown */}
                {activeCommentPostId === post._id && (
                  <div style={{ marginTop: '15px', borderTop: '1px solid var(--card-border)', paddingTop: '15px' }}>
                    {post.commentRestriction === 'SubscribersOnly' && !(localStorage.getItem('gymsync_subscribed') === 'true' || userRole === 'Admin' || userRole === 'SuperAdmin' || userRole === 'GymOwner') ? (
                      <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                        🔒 <strong>Subscriber Exclusive:</strong> Only GymSync Subscribers can comment on this Admin post.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <input 
                          type="text" 
                          placeholder="Write a comment..." 
                          style={{ flex: 1, padding: '10px', borderRadius: '20px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                          id={`comment-input-${post._id}`}
                          onKeyDown={async (e) => {
                            if(e.key === 'Enter' && e.target.value.trim()) {
                              const val = e.target.value;
                              e.target.value = '';
                              try {
                                const res = await fetch(`/api/posts/${post._id}/comment`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', ...authHeaders },
                                  body: JSON.stringify({ text: val })
                                });
                                const updatedComments = await res.json();
                                setPosts(posts.map(p => p._id === post._id ? { ...p, comments: updatedComments } : p));
                                
                                // Create Notification
                                fetch('/api/notifications', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: post.author?.name || 'Unknown User', type: 'comment', message: `${userName} commented on your post.`, link: '/home' })
                                });
                                toast.success("Comment added!");
                              } catch (err) { toast.error("Failed to add comment."); }
                            }
                          }}
                        />
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {post.comments && post.comments.map((c) => (
                        <div key={c._id || Math.random()} style={{ background: 'var(--card-bg)', padding: '10px 15px', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{c.author || 'User'}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(c.date).toLocaleDateString()}</span>
                          </div>
                          <p style={{ fontSize: '0.9rem', margin: 0 }}>{c.text}</p>
                          
                          {/* Nested Replies Display */}
                          <div style={{ marginTop: '10px', paddingLeft: '15px', borderLeft: '2px solid var(--card-border)' }}>
                            {c.replies && c.replies.map(r => (
                              <div key={r._id || Math.random()} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                  <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{r.author || 'User'}</span>
                                  <span style={{ fontSize: '0.8rem', marginLeft: '8px', color: 'var(--text-secondary)' }}>{r.text}</span>
                                </div>
                                
                                {/* Edit/Delete Reply Buttons (GDPR & Management) */}
                                {(r.author === userName || userRole === 'admin') && (
                                  <div style={{ display: 'flex', gap: '5px' }}>
                                    <button 
                                      onClick={async () => {
                                        const newText = window.prompt('Edit your reply:', r.text);
                                        if (newText && newText.trim() !== '' && newText !== r.text) {
                                          try {
                                            const res = await fetch(`/api/posts/${post._id}/comment/${c._id}/reply/${r._id}`, { 
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ text: newText.trim() })
                                            });
                                            if(res.ok) {
                                              const updatedComments = await res.json();
                                              setPosts(posts.map(p => p._id === post._id ? { ...p, comments: updatedComments } : p));
                                              toast.success("Reply updated.");
                                            }
                                          } catch (err) { toast.error("Failed to update reply."); }
                                        }
                                      }}
                                      style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '2px 5px' }}
                                      title="Edit Reply"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        if(window.confirm('Delete your reply?')) {
                                          try {
                                            const res = await fetch(`/api/posts/${post._id}/comment/${c._id}/reply/${r._id}`, { method: 'DELETE' });
                                            if(res.ok) {
                                              const updatedComments = await res.json();
                                              setPosts(posts.map(p => p._id === post._id ? { ...p, comments: updatedComments } : p));
                                              toast.success("Reply deleted.");
                                            }
                                          } catch (err) { toast.error("Failed to delete reply."); }
                                        }
                                      }}
                                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 5px' }}
                                      title="Delete Reply"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {/* Reply Input */}
                            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                              <input 
                                type="text" 
                                placeholder="Reply..." 
                                style={{ flex: 1, padding: '5px 10px', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--card-bg)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                                onKeyDown={async (e) => {
                                  if(e.key === 'Enter' && e.target.value.trim()) {
                                    const val = e.target.value;
                                    e.target.value = '';
                                    try {
                                      const res = await fetch(`/api/posts/${post._id}/comment/${c._id}/reply`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ text: val, authorName: userName })
                                      });
                                      const updatedComments = await res.json();
                                      setPosts(posts.map(p => p._id === post._id ? { ...p, comments: updatedComments } : p));
                                      
                                      fetch('/api/notifications', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: c.author, type: 'reply', message: `${userName} replied to your comment.` })
                                      });
                                    } catch (err) { toast.error("Failed to add reply."); }
                                  }
                                }}
                              />
                            </div>
                          </div>
                          
                        </div>
                      ))}
                      {(!post.comments || post.comments.length === 0) && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No comments yet.</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {posts.length === 0 && <p style={{textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px'}}>No posts yet. Be the first!</p>}
          </div>
        </div>

        {/* Right Sidebar (Ads/Suggestions & Widgets) - Trainee Only */}
        {isTrainee && (
          <div className="feed-sidebar">
            {rightAds.map(ad => (
              <div key={ad._id} className="glass-panel sidebar-widget ad-widget">
                <h4>Suggested {ad.type}</h4>
                <p className="ad-title">{ad.title}</p>
                <p className="ad-desc">{ad.description}</p>
                <button className="btn btn-outline btn-sm w-100 mt-10">View details</button>
              </div>
            ))}
            
            <div className="glass-panel sidebar-widget ad-widget" style={{ marginTop: '15px' }}>
              <h4>🔥 Weekly Leaderboard</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0', borderBottom: '1px solid var(--card-border)', paddingBottom: '5px' }}>
                <span>1. Mike Tyson</span>
                <span style={{ color: 'var(--primary-accent)' }}>150 Pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0', borderBottom: '1px solid var(--card-border)', paddingBottom: '5px' }}>
                <span>2. {userName}</span>
                <span style={{ color: 'var(--primary-accent)' }}>{localStorage.getItem('gymsync_points') || 0} Pts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0' }}>
                <span>3. Arnold S.</span>
                <span style={{ color: 'var(--primary-accent)' }}>95 Pts</span>
              </div>
              <button className="btn btn-outline btn-sm w-100 mt-10" onClick={() => window.location.href='/profile'}>View Your Stats</button>
            </div>

            <div className="glass-panel sidebar-widget ad-widget" style={{ marginTop: '15px' }}>
              <h4>📍 Nearby Gyms</h4>
              <p className="ad-title">Iron Temple Fitness</p>
              <p className="ad-desc">0.5 miles away • Open 24/7</p>
              <button className="btn btn-outline btn-sm w-100 mt-10" onClick={() => window.location.href='/explore'}>Explore Map</button>
            </div>

          </div>
        )}
      </div>
      
      {/* Admin Post Removal Modal */}
      <Modal isOpen={Boolean(removalPostId)} onClose={() => setRemovalPostId(null)} title="Remove Community Post (Admin)">
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!removalPostId) return;
          try {
            const res = await fetch(`/api/admin/posts/${removalPostId}/remove-with-reason`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json', ...authHeaders },
              body: JSON.stringify({ reason: removalReason })
            });
            if (res.ok) {
              const data = await res.json();
              toast.success(`Post removed. Notification sent to author: "${data.reason}"`);
              setPosts(prev => prev.filter(p => p._id !== removalPostId));
              setRemovalPostId(null);
            }
          } catch (err) {
            toast.error('Failed to remove post');
          }
        }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Specify the reason for post removal. The author will automatically receive a notification explaining why their post was removed.
          </p>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Reason for Removal</label>
            <select 
              className="search-input"
              value={removalReason}
              onChange={e => setRemovalReason(e.target.value)}
            >
              <option value="Violation of community guidelines">Violation of community guidelines</option>
              <option value="Inappropriate content or spam">Inappropriate content or spam</option>
              <option value="Harassment or offensive language">Harassment or offensive language</option>
              <option value="Misleading or unsafe fitness advice">Misleading or unsafe fitness advice</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
            <Trash2 size={16} /> Confirm Post Removal & Notify Author
          </button>
        </form>
      </Modal>

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
            >
              <option value="Inappropriate Content">Inappropriate Content</option>
              <option value="Spam">Spam</option>
              <option value="Harassment">Harassment</option>
              <option value="Misleading Information">Misleading Information</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>Explanation (Optional)</label>
            <textarea
              className="search-input"
              rows={3}
              value={reportExplanation}
              onChange={e => setReportExplanation(e.target.value)}
              placeholder="Provide more details about why you are reporting this post..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--panel-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b', color: 'var(--text-primary)' }}>
            <AlertTriangle size={16} /> Submit Report
          </button>
        </form>
      </Modal>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} alt="Full Size" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
          <button style={{ position: 'absolute', top: '20px', right: '30px', background: 'var(--card-border)', border: 'none', color: 'var(--text-primary)', borderRadius: '50%', padding: '10px', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
