import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, MessageCircle, AlertTriangle, Trash2 } from 'lucide-react';

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
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);

  if (!post || !post._id) return null;

  const authorName = post.authorName || post.author?.name || 'Unknown User';
  const authorAvatar = globalUsers[authorName] || (authorName.charAt(0).toUpperCase() || 'U');
  const likes = Array.isArray(post.likes) ? post.likes : [];
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const isLikedByMe = likes.includes(currentUserName);
  const isAdmin = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(userRole);
  const isGuest = userRole === 'guest' || !userRole;

  const handleKeyDownComment = (e) => {
    if (e.key === 'Enter' && commentInput.trim()) {
      onAddComment(post._id, commentInput.trim());
      setCommentInput('');
    }
  };

  return (
    <div className="post-card glass-panel" style={{ marginBottom: '20px' }}>
      {/* Post Header */}
      <div className="post-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: 'var(--card-bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {globalUsers[authorName] ? (
              <img src={globalUsers[authorName]} alt={authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              authorAvatar
            )}
          </div>
          <div className="post-meta">
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>
              <Link to={authorName === currentUserName ? '/profile' : `/profile/${authorName}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                {authorName}
              </Link>
            </h4>
            <span className="post-time" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {post.createdAt ? new Date(post.createdAt).toLocaleString() : 'Recently'}
            </span>
          </div>
        </div>

        {/* Header Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!isGuest && (
            <button
              onClick={() => onReport && onReport(post._id)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px' }}
              title="Report Post"
            >
              <AlertTriangle size={14} /> Report
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onAdminRemove && onAdminRemove(post._id)}
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px' }}
              title="Remove Post (Admin)"
            >
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Post Text Content */}
      <p className="post-content" style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '12px' }}>
        {post.content}
      </p>

      {/* Post Media */}
      {post.mediaUrl && (
        <div className="post-media" style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setSelectedMedia(post.mediaUrl)}>
          {post.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
            <video src={post.mediaUrl} controls style={{ width: '100%', maxHeight: '400px', borderRadius: '8px' }} />
          ) : (
            <img src={post.mediaUrl} alt="Post media" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px' }} />
          )}
        </div>
      )}

      {/* Post Action Buttons Bar */}
      <div className="post-actions" style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--card-border)', paddingTop: '10px' }}>
        <button
          className={`action-btn ${isLikedByMe ? 'liked' : ''}`}
          onClick={() => onLike && onLike(post._id)}
          disabled={isGuest}
          style={{ background: 'none', border: 'none', color: isLikedByMe ? 'var(--primary-accent)' : 'var(--text-secondary)', cursor: isGuest ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <ThumbsUp size={16} /> {likes.length} Likes
        </button>
        <button
          className="action-btn"
          onClick={() => setShowComments(!showComments)}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <MessageCircle size={16} /> {comments.length} Comments
        </button>
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
              const commentAuthor = c.authorName || c.name || 'User';
              const canDeleteComment = isAdmin || commentAuthor === currentUserName;
              const replies = Array.isArray(c.replies) ? c.replies : [];

              return (
                <div key={c._id || idx} className="comment-item" style={{ background: 'var(--card-bg-light)', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{commentAuthor}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
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
                      const replyAuthor = r.authorName || r.name || 'User';
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
