import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  MessageCircle, 
  AlertTriangle, 
  Trash2, 
  MoreHorizontal, 
  Copy, 
  UserPlus, 
  UserCheck, 
  ExternalLink,
  X
} from 'lucide-react';
import UserAvatar from '../../../components/common/UserAvatar';
import { toast } from 'react-toastify';

const isVideoMedia = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('data:video/')) return true;
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return Boolean(clean.match(/\.(mp4|webm|ogg|mov|m4v|mkv|3gp|flv|avi)$/i));
};

const PostCard = ({
  post,
  currentUserName = '',
  userRole = '',
  globalUsers = {},
  onLike,
  onAddComment,
  onDeleteComment,
  onAddReply,
  onDeleteReply,
  onReport,
  onAdminRemove
}) => {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const menuRef = useRef(null);

  if (!post || !post._id) return null;

  const authorName = post.authorName || post.author?.name || 'Unknown User';
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const isLikedByMe = likes.includes(currentUserName);
  const isAdmin = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(userRole);
  const isAuthor = authorName === currentUserName;
  const isGuest = userRole === 'guest' || !userRole || !currentUserName || currentUserName === 'Guest User';
  const token = localStorage.getItem('gymsync_token') || '';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const promptLogin = (action = 'interact with posts') => {
    toast.info(`Please log in to ${action}`);
  };

  const handleCopyLink = (e) => {
    if (e) e.stopPropagation();
    const postUrl = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(postUrl);
    toast.success('Post link copied to clipboard!');
    setShowMenu(false);
  };

  const handleToggleFollow = async (e) => {
    if (e) e.stopPropagation();
    if (isGuest || !token) {
      promptLogin(`follow @${authorName}`);
      setShowMenu(false);
      return;
    }
    if (isAuthor) return;

    setIsFollowLoading(true);
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
        toast.error('Could not update follow status');
      } else {
        toast.success(nextState ? `Following @${authorName}` : `Unfollowed @${authorName}`);
      }
    } catch (err) {
      setIsFollowing(!nextState);
      toast.error('Network error updating follow status');
    } finally {
      setIsFollowLoading(false);
      setShowMenu(false);
    }
  };

  const handleOpenPostDetail = () => {
    navigate(`/post/${post._id}`);
  };

  const handleKeyDownComment = (e) => {
    if (e.key === 'Enter' && commentInput.trim()) {
      if (isGuest) {
        promptLogin('leave comments');
        return;
      }
      onAddComment(post._id, commentInput.trim());
      setCommentInput('');
    }
  };

  return (
    <div 
      className="post-card glass-panel" 
      style={{ 
        marginBottom: '20px', 
        position: 'relative', 
        transition: 'box-shadow 0.2s ease',
        zIndex: showMenu ? 60 : 1 
      }}
    >
      {/* Post Header */}
      <div className="post-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <UserAvatar 
            src={globalUsers[authorName]} 
            name={authorName} 
            size={42} 
          />
          <div className="post-meta">
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>
              <Link to={authorName === currentUserName ? '/profile' : `/profile/${authorName}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>
                {authorName}
              </Link>
            </h4>
            <span className="post-time" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {post.createdAt ? new Date(post.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
            </span>
          </div>
        </div>

        {/* 3-Dots Contextual Menu (Facebook-style) */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Post options"
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
                boxShadow: '0 14px 40px rgba(0, 0, 0, 0.75)',
                padding: '6px',
                minWidth: '190px',
                zIndex: 1000,
                animation: 'fadeIn 0.15s ease'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Copy Link to Post */}
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
                  color: 'var(--text-primary, #fff)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <Copy size={15} color="var(--primary-accent)" /> Copy Post Link
              </button>

              {/* View Standalone Post */}
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  handleOpenPostDetail();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'var(--text-primary, #fff)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <ExternalLink size={15} color="#38bdf8" /> Open Post Details
              </button>

              {/* Follow / Unfollow Author (if not self) */}
              {!isAuthor && (
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck size={15} color="#10b981" /> Unfollow @{authorName}
                    </>
                  ) : (
                    <>
                      <UserPlus size={15} color="#ec4899" /> Follow @{authorName}
                    </>
                  )}
                </button>
              )}

              {/* Report Post */}
              {!isGuest && !isAuthor && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onReport && onReport(post._id);
                  }}
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
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <AlertTriangle size={15} /> Report Post
                </button>
              )}

              {/* Delete Post (Author or Admin) */}
              {(isAuthor || isAdmin) && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onAdminRemove && onAdminRemove(post._id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <Trash2 size={15} /> Delete Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Text Content - Clickable to open details */}
      <p 
        className="post-content" 
        onClick={handleOpenPostDetail}
        style={{ 
          fontSize: '0.95rem', 
          color: 'var(--text-primary)', 
          lineHeight: 1.5, 
          marginBottom: '12px',
          cursor: 'pointer'
        }}
        title="Click to view full post discussion"
      >
        {post.content}
      </p>

      {/* Post Media - Clickable */}
      {post.mediaUrl && (
        <div 
          className="post-media" 
          style={{ 
            marginBottom: '12px', 
            borderRadius: '10px', 
            overflow: 'hidden', 
            cursor: 'pointer',
            background: '#000',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }} 
          onClick={handleOpenPostDetail}
        >
          {isVideoMedia(post.mediaUrl) ? (
            <video 
              src={post.mediaUrl} 
              controls 
              playsInline
              preload="metadata"
              style={{ width: '100%', maxHeight: '460px', borderRadius: '10px', display: 'block', objectFit: 'contain', background: '#000' }} 
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt="Post media"
              style={{ width: '100%', maxHeight: '460px', objectFit: 'cover', borderRadius: '10px', display: 'block' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }}
            />
          )}
        </div>
      )}

      {/* Post Action Buttons Bar */}
      <div className="post-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            className={`action-btn ${isLikedByMe ? 'liked' : ''}`}
            onClick={() => {
              if (isGuest) {
                promptLogin('like posts');
                return;
              }
              onLike && onLike(post._id);
            }}
            title="Like post"
            style={{ background: 'none', border: 'none', color: isLikedByMe ? 'var(--primary-accent)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Dumbbell size={16} /> {likes.length}
          </button>
          <button
            className="action-btn"
            onClick={() => setShowComments(!showComments)}
            title="View comments"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <MessageCircle size={16} /> {comments.length}
          </button>
        </div>
      </div>

      {/* Comments & Replies Collapsible Section */}
      {showComments && (
        <div className="comments-section" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--card-border)' }}>
          {!isGuest && (
            <div className="add-comment" style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <input
                type="text"
                className="search-input"
                placeholder="Write a comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={handleKeyDownComment}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
          )}

          <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {comments.map((c, idx) => {
              const commentAuthor = (typeof c.author === 'object' ? c.author?.name : c.author) || c.authorName || c.name || 'User';
              const canDeleteComment = isAdmin || commentAuthor === currentUserName;
              const replies = Array.isArray(c.replies) ? c.replies : [];

              return (
                <div key={c._id || idx} className="comment-item" style={{ background: 'var(--card-bg-light)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{commentAuthor}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {c.createdAt || c.date ? new Date(c.createdAt || c.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                    {canDeleteComment && (
                      <button
                        onClick={() => onDeleteComment && onDeleteComment(post._id, c._id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                        title="Delete Comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{c.text}</p>

                  {/* Nested Replies */}
                  <div style={{ marginTop: '8px', paddingLeft: '12px', borderLeft: '2px solid var(--card-border)' }}>
                    {replies.map((r, rIdx) => {
                      const replyAuthor = (typeof r.author === 'object' ? r.author?.name : r.author) || r.authorName || r.name || 'User';
                      const canDeleteReply = isAdmin || replyAuthor === currentUserName;
                      return (
                        <div key={r._id || rIdx} style={{ fontSize: '0.8rem', margin: '4px 0', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: 'var(--primary-accent)' }}>{replyAuthor}: </strong>
                            <span style={{ color: 'var(--text-secondary)' }}>{r.text}</span>
                          </div>
                          {canDeleteReply && (
                            <button
                              onClick={() => onDeleteReply && onDeleteReply(post._id, c._id, r._id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                              title="Delete Reply"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Reply Input */}
                    {!isGuest && (
                      <input
                        type="text"
                        placeholder="Reply..."
                        style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: '4px', color: 'var(--text-primary)', width: '100%', marginTop: '6px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            onAddReply && onAddReply(post._id, c._id, e.target.value.trim());
                            e.target.value = '';
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            {comments.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>No comments yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
