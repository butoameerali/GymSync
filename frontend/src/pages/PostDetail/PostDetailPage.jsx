import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Dumbbell, 
  MessageCircle, 
  Share2, 
  ArrowLeft, 
  Trash2, 
  UserPlus, 
  UserCheck, 
  AlertTriangle, 
  MoreHorizontal, 
  Copy, 
  Send 
} from 'lucide-react';
import { postService } from '../../services/postService';
import UserAvatar from '../../components/common/UserAvatar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import './PostDetailPage.css';

const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const token = localStorage.getItem('gymsync_token') || '';
  const currentUserName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const userRole = localStorage.getItem('gymsync_role') || '';
  const isGuest = !token || userRole === 'guest' || currentUserName === 'Guest User';
  const isAdmin = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(userRole);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await postService.getPostById(id);
        setPost(data);
      } catch (err) {
        setError(err.message || 'Post could not be loaded or is under review.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPost();
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const authorName = post?.authorName || post?.author?.name || 'Athlete';
  const likes = Array.isArray(post?.likes) ? post.likes : [];
  const comments = Array.isArray(post?.comments) ? post.comments : [];
  const isLikedByMe = likes.includes(currentUserName);
  const isAuthor = authorName === currentUserName;

  const promptLogin = (action = 'interact') => {
    toast.info(`Please log in to ${action}`);
  };

  const handleLike = async () => {
    if (isGuest) {
      promptLogin('like this post');
      return;
    }
    const updatedLikes = isLikedByMe
      ? likes.filter(u => u !== currentUserName)
      : [...likes, currentUserName];

    setPost(prev => ({ ...prev, likes: updatedLikes }));

    try {
      await postService.likePost(post._id);
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    if (isGuest) {
      promptLogin('leave comments');
      return;
    }

    const newComment = {
      _id: `temp-${Date.now()}`,
      author: currentUserName,
      text: commentInput.trim(),
      createdAt: new Date().toISOString()
    };

    setPost(prev => ({ ...prev, comments: [...(prev.comments || []), newComment] }));
    const commentToSend = commentInput.trim();
    setCommentInput('');

    try {
      await postService.addComment(post._id, commentToSend);
    } catch (err) {
      toast.error('Failed to post comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    setPost(prev => ({
      ...prev,
      comments: prev.comments.filter(c => c._id !== commentId)
    }));
    try {
      await postService.deleteComment(post._id, commentId);
      toast.success('Comment deleted');
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Post link copied to clipboard!');
    setShowMenu(false);
  };

  const handleToggleFollow = async () => {
    if (isGuest) {
      promptLogin(`follow @${authorName}`);
      return;
    }
    if (isAuthor) return;

    const nextState = !isFollowing;
    setIsFollowing(nextState);

    try {
      const endpoint = nextState ? '/api/users/follow' : '/api/users/unfollow';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ followerName: currentUserName, targetName: authorName })
      });
      if (!res.ok) {
        setIsFollowing(!nextState);
        toast.error('Failed to update follow status');
      } else {
        toast.success(nextState ? `Following @${authorName}` : `Unfollowed @${authorName}`);
      }
    } catch (err) {
      setIsFollowing(!nextState);
      toast.error('Network error');
    }
  };

  const handleReportPost = async () => {
    if (isGuest) {
      promptLogin('report posts');
      return;
    }
    try {
      await postService.reportPost(post._id, 'Community standard violation', 'Reported from post detail view');
      toast.info('Post reported to moderation queue.');
      setShowMenu(false);
    } catch (err) {
      toast.error('Failed to report post');
    }
  };

  if (loading) {
    return (
      <div className="post-detail-page">
        <LoadingSpinner size="large" message="Loading post details..." />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-container">
          <button onClick={() => navigate(-1)} className="post-detail-back-btn">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="post-detail-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: '#fff', marginBottom: '8px' }}>Post Unavailable</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px' }}>
              {error || 'This post may have been removed, holds pending appeals, or does not exist.'}
            </p>
            <Link to="/home" className="btn btn-primary">Return to Feed</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="post-detail-page">
      <div className="post-detail-container">
        <button onClick={() => navigate(-1)} className="post-detail-back-btn">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="post-detail-card">
          {/* Header */}
          <div className="post-detail-header">
            <div className="post-detail-author-info">
              <UserAvatar name={authorName} size={46} />
              <div>
                <Link to={`/profile/${authorName}`} className="post-detail-author-name">
                  {authorName}
                </Link>
                <div className="post-detail-timestamp">
                  {post.createdAt ? new Date(post.createdAt).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' }) : 'Recently'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {!isAuthor && !isGuest && (
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className="btn btn-outline btn-sm"
                  style={{ borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck size={14} color="#10b981" /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> Follow
                    </>
                  )}
                </button>
              )}

              {/* 3-Dots Menu */}
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  title="Options"
                >
                  <MoreHorizontal size={18} />
                </button>

                {showMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '6px',
                      background: 'var(--card-bg, #111827)',
                      border: '1px solid var(--card-border, rgba(255, 255, 255, 0.12))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                      padding: '6px',
                      minWidth: '180px',
                      zIndex: 100
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        background: 'none',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <Copy size={15} color="var(--primary-accent)" /> Copy Link
                    </button>

                    {!isGuest && !isAuthor && (
                      <button
                        type="button"
                        onClick={handleReportPost}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 12px',
                          background: 'none',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#f59e0b',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <AlertTriangle size={15} /> Report Post
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Post Text Content */}
          <div className="post-detail-content">
            {post.content}
          </div>

          {/* Media Player / Image */}
          {post.mediaUrl && (
            <div className="post-detail-media-container">
              {post.mediaUrl.match(/\.(mp4|webm|ogg|mov|m4v)$/i) ? (
                <video 
                  src={post.mediaUrl} 
                  controls 
                  autoPlay 
                  playsInline 
                  className="post-detail-media" 
                  style={{ width: '100%' }}
                />
              ) : (
                <img 
                  src={post.mediaUrl} 
                  alt="Post media" 
                  className="post-detail-media" 
                />
              )}
            </div>
          )}

          {/* Post Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button
                type="button"
                onClick={handleLike}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isLikedByMe ? 'var(--primary-accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.92rem',
                  fontWeight: 600
                }}
              >
                <Dumbbell size={18} /> {likes.length}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: 600 }}>
                <MessageCircle size={18} /> {comments.length}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem'
              }}
              title="Share post"
            >
              <Share2 size={16} /> Share
            </button>
          </div>

          {/* Comments Section */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
            <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '16px' }}>
              Discussion ({comments.length})
            </h4>

            {/* Comment Form (for logged-in athletes) */}
            {!isGuest ? (
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Join the discussion... (Press Enter to post)"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '24px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--card-border)',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'var(--primary-accent, #6366f1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
            ) : null}

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {comments.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                  No comments yet. Be the first to cheer them on!
                </p>
              ) : (
                comments.map((c, idx) => {
                  const cAuthor = (typeof c.author === 'object' ? c.author?.name : c.author) || c.authorName || 'User';
                  const canDelete = isAdmin || cAuthor === currentUserName;
                  return (
                    <div key={c._id || idx} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <Link to={`/profile/${cAuthor}`} style={{ fontWeight: 700, color: 'var(--primary-accent)', fontSize: '0.88rem', textDecoration: 'none' }}>
                          {cAuthor}
                        </Link>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c._id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            title="Delete comment"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        {c.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Unauthenticated Guest Call-to-Action Banner */}
          {isGuest && (
            <div className="post-detail-guest-banner">
              <div>
                <strong style={{ color: '#fff', fontSize: '0.98rem', display: 'block', marginBottom: '4px' }}>
                  Log in to interact with GymSync athletes
                </strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Sign in to like this post, comment, follow creators, and save your workouts.
                </span>
              </div>
              <Link 
                to={`/login?redirect=/post/${post._id}`} 
                className="btn btn-primary"
                style={{ padding: '8px 20px', borderRadius: '20px', fontWeight: 600, textDecoration: 'none' }}
              >
                Log In / Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;
