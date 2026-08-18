import React, { useState, useEffect, useRef } from 'react';
import { ImageIcon, Video, Send, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PostList from '../../features/social/components/PostList';
import { rankFeedPosts } from '../../features/social/utils/feedRanking';
import { postService } from '../../services/postService';
import './Home.css';

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [globalUsers, setGlobalUsers] = useState({});
  const fileInputRef = useRef(null);
  
  const userRole = localStorage.getItem('gymsync_role') || 'guest';
  const isGuest = userRole === 'guest';
  const isTrainee = userRole === 'User' || userRole === 'user' || isGuest;
  const isAdmin = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(userRole);
  const userName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const [currentUser, setCurrentUser] = useState(null);

  // Admin Removal Modal State
  const [removalPostId, setRemovalPostId] = useState(null);
  const [removalReason, setRemovalReason] = useState('Violation of community guidelines');

  // User Report Modal State
  const [reportPostId, setReportPostId] = useState(null);
  const [reportReason, setReportReason] = useState('Inappropriate Content');
  const [reportExplanation, setReportExplanation] = useState('');

  // Fetch dynamic data on mount
  useEffect(() => {
    setLoading(true);
    if (!isGuest) {
      fetch(`/api/users/${userName}`)
        .then(res => res.ok ? res.json() : null)
        .then(user => {
          if (user && user._id) setCurrentUser(user);
        })
        .catch(err => console.error("Error fetching user data:", err));
    }

    postService.getPosts()
      .then(data => setPosts(data))
      .finally(() => setLoading(false));
      
    fetch('/api/users')
      .then(res => res.ok ? res.json() : [])
      .then(users => {
        const userMap = {};
        if (Array.isArray(users)) {
          users.forEach(u => { if (u && u.name) userMap[u.name] = u.profilePic; });
        }
        setGlobalUsers(userMap);
      })
      .catch(err => console.error(err));

    fetch('/api/suggestions')
      .then(res => res.ok ? res.json() : [])
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
      const createdPost = await postService.createPost(formData);
      createdPost.author = { name: userName, role: userRole };
      setPosts([createdPost, ...posts]);
      setNewPost('');
      setSelectedFile(null);
      toast.success("Post published to Timeline!");
    } catch (err) {
      toast.error(err.message || "Error creating post");
    }
  };

  const handleLikePost = async (id) => {
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
      await postService.likePost(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId, text) => {
    try {
      const updatedPost = await postService.addComment(postId, text);
      setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
      toast.success("Comment added");
    } catch (err) {
      toast.error("Failed to add comment");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const updatedPost = await postService.deleteComment(postId, commentId);
      setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };

  const handleAddReply = async (postId, commentId, text) => {
    try {
      const updatedPost = await postService.addReply(postId, commentId, text);
      setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
      toast.success("Reply added");
    } catch (err) {
      toast.error("Failed to add reply");
    }
  };

  const handleDeleteReply = async (postId, commentId, replyId) => {
    try {
      const updatedPost = await postService.deleteReply(postId, commentId, replyId);
      setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
      toast.success("Reply deleted");
    } catch (err) {
      toast.error("Failed to delete reply");
    }
  };

  const handleReportPostSubmit = async () => {
    if (!reportPostId) return;
    try {
      await postService.reportPost(reportPostId, reportReason, reportExplanation);
      toast.success("Post report submitted for moderation review.");
      setReportPostId(null);
      setReportExplanation('');
    } catch (err) {
      toast.error(err.message || "Failed to submit report");
    }
  };

  const handleAdminRemovePostSubmit = async () => {
    if (!removalPostId) return;
    try {
      await postService.removePostWithReason(removalPostId, removalReason);
      setPosts(prev => prev.filter(p => p._id !== removalPostId));
      toast.success("Post removed by Admin");
      setRemovalPostId(null);
    } catch (err) {
      toast.error(err.message || "Failed to remove post");
    }
  };

  const leftAds = suggestions.slice(0, Math.ceil(suggestions.length / 2));
  const rightAds = suggestions.slice(Math.ceil(suggestions.length / 2));

  // Rank posts deterministically using feed ranking algorithm
  const rankedPosts = rankFeedPosts(posts, {
    currentUserName: userName,
    userFriends: currentUser?.friends || [],
    userFollowing: currentUser?.following || []
  });

  return (
    <div className="home-page">
      <div className="container feed-container" style={!isTrainee ? { display: 'block', maxWidth: '800px', margin: '0 auto' } : {}}>
        
        {/* Left Sidebar Suggestions - Trainee Only */}
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
          </div>
        )}

        {/* Main Social Feed Column */}
        <div className="feed-main">
          {!isGuest && (
            <div className="glass-panel create-post-card">
              <div className="post-input-container">
                <div className="user-avatar-circle">
                  {globalUsers[userName] ? (
                    <img src={globalUsers[userName]} alt={userName} className="avatar-img" />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
                <textarea
                  className="create-post-textarea"
                  placeholder={`What's on your fitness mind, ${userName}?`}
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  rows={2}
                />
              </div>

              {selectedFile && (
                <div className="selected-file-preview">
                  <span>Selected file: {selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)}>Remove</button>
                </div>
              )}

              <div className="create-post-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                />
                <div className="media-buttons">
                  <button className="btn-icon" onClick={() => fileInputRef.current?.click()} type="button">
                    <ImageIcon size={18} /> Photo
                  </button>
                  <button className="btn-icon" onClick={() => fileInputRef.current?.click()} type="button">
                    <Video size={18} /> Video
                  </button>
                </div>
                <button className="btn-glow btn-sm" onClick={handleCreatePost}>
                  <Send size={16} /> Post
                </button>
              </div>
            </div>
          )}

          {/* Social Feed List */}
          {loading ? (
            <LoadingSpinner size="large" message="Loading GymSync timeline..." />
          ) : (
            <PostList
              posts={rankedPosts}
              currentUserName={userName}
              userRole={userRole}
              globalUsers={globalUsers}
              onLike={handleLikePost}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onAddReply={handleAddReply}
              onDeleteReply={handleDeleteReply}
              onReport={(id) => setReportPostId(id)}
              onAdminRemove={(id) => setRemovalPostId(id)}
            />
          )}
        </div>

        {/* Right Sidebar Suggestions - Trainee Only */}
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
          </div>
        )}
      </div>

      {/* Admin Removal Reason Modal */}
      {removalPostId && (
        <Modal isOpen={!!removalPostId} onClose={() => setRemovalPostId(null)} title="Admin Post Removal">
          <div className="admin-removal-modal">
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Select or specify the official reason for removing this community post:</p>
            <select
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              className="search-input"
              style={{ width: '100%', marginBottom: '16px' }}
            >
              <option value="Violation of community guidelines">Violation of community guidelines</option>
              <option value="Inappropriate language or harassment">Inappropriate language or harassment</option>
              <option value="Spam or promotional content">Spam or promotional content</option>
              <option value="Misleading fitness/medical advice">Misleading fitness/medical advice</option>
              <option value="Copyright violation">Copyright violation</option>
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-outline" onClick={() => setRemovalPostId(null)}>Cancel</button>
              <button className="btn btn-glow" style={{ background: '#ef4444' }} onClick={handleAdminRemovePostSubmit}>Confirm Removal</button>
            </div>
          </div>
        </Modal>
      )}

      {/* User Post Report Modal */}
      {reportPostId && (
        <Modal isOpen={!!reportPostId} onClose={() => setReportPostId(null)} title="Report Post to Moderation">
          <div className="report-modal">
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>Help us keep GymSync safe. Why are you reporting this post?</p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="search-input"
              style={{ width: '100%', marginBottom: '12px' }}
            >
              <option value="Inappropriate Content">Inappropriate Content</option>
              <option value="Harassment / Bullying">Harassment / Bullying</option>
              <option value="Spam">Spam</option>
              <option value="False Fitness Advice">False Fitness Advice</option>
            </select>
            <textarea
              placeholder="Additional details (optional)..."
              value={reportExplanation}
              onChange={(e) => setReportExplanation(e.target.value)}
              style={{ width: '100%', minHeight: '80px', marginBottom: '16px', borderRadius: '8px', padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: '#fff' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-outline" onClick={() => setReportPostId(null)}>Cancel</button>
              <button className="btn btn-glow" onClick={handleReportPostSubmit}>Submit Report</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Home;
