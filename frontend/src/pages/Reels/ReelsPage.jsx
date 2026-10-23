import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Dumbbell, 
  MessageCircle, 
  Share2, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  X, 
  Send,
  Film,
  UserCheck,
  UserPlus,
  Sparkles,
  Heart
} from 'lucide-react';
import { postService } from '../../services/postService';
import UserAvatar from '../../components/common/UserAvatar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import './ReelsPage.css';

// Reliable public fitness/workout demonstration media URLs
const DEFAULT_DEMO_REELS = [
  {
    _id: 'demo-reel-1',
    authorName: 'Alex Rivers',
    content: 'Mastering the heavy bench press arch and leg drive! 💥 Consistency and proper technique are everything.',
    mediaUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop',
    likes: ['user1', 'user2', 'user3'],
    comments: [
      { _id: 'c1', author: 'Sarah Connor', text: 'Insane form! How many reps did you hit?' },
      { _id: 'c2', author: 'Marcus V.', text: 'Leg drive makes all the difference.' }
    ],
    createdAt: new Date().toISOString()
  },
  {
    _id: 'demo-reel-2',
    authorName: 'Elena Rostova',
    content: 'Full body mobility and conditioning circuit breakdown. Save this for your next recovery session! 🔥',
    mediaUrl: 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/abductors/lever-seated-hip-abduction.gif',
    posterUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop',
    likes: ['user2', 'user4', 'user5'],
    comments: [
      { _id: 'c3', author: 'Coach Mike', text: 'High energy! Great pacing.' }
    ],
    createdAt: new Date().toISOString()
  },
  {
    _id: 'demo-reel-3',
    authorName: 'Marcus Vance',
    content: 'Explosive functional conditioning finisher. 30s on, 15s active rest for 5 intense rounds! ⚡',
    mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop',
    likes: ['user1', 'user4'],
    comments: [
      { _id: 'c4', author: 'Alex Rivers', text: 'Brutal workout, tried it yesterday!' }
    ],
    createdAt: new Date().toISOString()
  }
];

const ReelsPage = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  // Default to muted so browsers allow instant autoplay without blocking
  const [isMuted, setIsMuted] = useState(true);
  const [showMuteHint, setShowMuteHint] = useState(true);
  const [followingMap, setFollowingMap] = useState({});
  const [expandedCaption, setExpandedCaption] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadVideoFile, setUploadVideoFile] = useState(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const lastTapRef = useRef(0);
  const lastWheelTime = useRef(0);

  const currentUserName = localStorage.getItem('gymsync_user_name') || 'Guest User';
  const token = localStorage.getItem('gymsync_token') || '';

  const isVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return Boolean(
      url.match(/\.(mp4|webm|ogg|mov|m4v|gif)(\?.*)?$/i) ||
      url.startsWith('data:video') ||
      url.includes('/videos/') ||
      url.includes('sample/')
    );
  };

  const isGifUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return Boolean(url.match(/\.gif(\?.*)?$/i));
  };

  const fetchReels = async () => {
    try {
      setLoading(true);
      const allPosts = await postService.getPosts();
      const videoPosts = (allPosts || []).filter(p => isVideoUrl(p.mediaUrl));
      
      if (videoPosts.length > 0) {
        setReels(videoPosts);
      } else {
        setReels(DEFAULT_DEMO_REELS);
      }
    } catch (err) {
      console.warn('Reels fetch falling back to demo reels:', err);
      setReels(DEFAULT_DEMO_REELS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
  }, []);

  // Dismiss mute hint after 3.5s
  useEffect(() => {
    const timer = setTimeout(() => setShowMuteHint(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  const currentReel = reels[currentIndex] || null;

  // Handle video element play / source changes
  useEffect(() => {
    setVideoError(false);
    setExpandedCaption(false);
    setShowComments(false);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // If unmuted autoplay was rejected by browser, fallback to muted play
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          }
        });
    }
  }, [currentIndex, reels]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    setShowMuteHint(false);
  };

  const requireAuth = (actionName = 'interact') => {
    if (!token || currentUserName === 'Guest User') {
      toast.info(`Please log in to ${actionName}`);
      return false;
    }
    return true;
  };

  const handleToggleFollow = async (targetAuthor, e) => {
    if (e) e.stopPropagation();
    if (!requireAuth('follow athletes')) return;
    if (!targetAuthor || targetAuthor === currentUserName) return;

    const isCurrentlyFollowing = Boolean(followingMap[targetAuthor]);
    setFollowingMap(prev => ({ ...prev, [targetAuthor]: !isCurrentlyFollowing }));

    try {
      const endpoint = isCurrentlyFollowing ? '/api/users/unfollow' : '/api/users/follow';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ followerName: currentUserName, targetName: targetAuthor })
      });
      if (!res.ok) {
        setFollowingMap(prev => ({ ...prev, [targetAuthor]: isCurrentlyFollowing }));
        toast.error('Could not update follow status');
      } else {
        toast.success(isCurrentlyFollowing ? `Unfollowed @${targetAuthor}` : `Now following @${targetAuthor}!`);
      }
    } catch (err) {
      setFollowingMap(prev => ({ ...prev, [targetAuthor]: isCurrentlyFollowing }));
      toast.error('Network error updating follow status');
    }
  };

  const handleNext = useCallback(() => {
    if (reels.length <= 1) return;
    setCurrentIndex(prev => (prev < reels.length - 1 ? prev + 1 : 0));
  }, [reels.length]);

  const handlePrev = useCallback(() => {
    if (reels.length <= 1) return;
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : reels.length - 1));
  }, [reels.length]);

  // Touch Swipe Handlers for Mobile Devices
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchEndY.current;
    const threshold = 45; // Minimum px distance for swipe detection
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        handleNext(); // Swiped Up -> Next Reel
      } else {
        handlePrev(); // Swiped Down -> Previous Reel
      }
    }
  };

  // Double-tap or double-click to like
  const handleDoubleTap = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap recognized
      handleLike(true);
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 900);
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  // Desktop Mouse Wheel Navigation
  const handleWheel = (e) => {
    if (showComments || showUploadModal) return;
    const now = Date.now();
    if (now - lastWheelTime.current < 500) return; // Debounce 500ms

    if (e.deltaY > 35) {
      lastWheelTime.current = now;
      handleNext();
    } else if (e.deltaY < -35) {
      lastWheelTime.current = now;
      handlePrev();
    }
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showComments || showUploadModal) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      }
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels.length, isPlaying, showComments, showUploadModal, isMuted, handleNext, handlePrev]);

  const handleLike = async (forceLike = false) => {
    if (!currentReel) return;
    if (!requireAuth('like reels')) return;

    const isLiked = (currentReel.likes || []).includes(currentUserName);
    if (forceLike && isLiked) {
      // Already liked, just trigger visual heart feedback
      return;
    }

    const updatedLikes = isLiked && !forceLike
      ? currentReel.likes.filter(u => u !== currentUserName)
      : [...(currentReel.likes || []).filter(u => u !== currentUserName), currentUserName];

    // Optimistic UI update
    setReels(prev => prev.map((r, idx) => idx === currentIndex ? { ...r, likes: updatedLikes } : r));

    if (!currentReel._id.startsWith('demo-')) {
      try {
        await postService.likePost(currentReel._id);
      } catch (err) {
        console.error('Like failed:', err);
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !currentReel) return;
    if (!requireAuth('leave comments')) return;

    const newComment = {
      _id: `temp-${Date.now()}`,
      author: currentUserName,
      text: commentText.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedComments = [...(currentReel.comments || []), newComment];
    setReels(prev => prev.map((r, idx) => idx === currentIndex ? { ...r, comments: updatedComments } : r));
    setCommentText('');

    if (!currentReel._id.startsWith('demo-')) {
      try {
        await postService.addComment(currentReel._id, newComment.text);
      } catch (err) {
        toast.error('Failed to post comment');
      }
    }
  };

  const handleShare = (e) => {
    if (e) e.stopPropagation();
    const shareUrl = (currentReel && !currentReel._id.startsWith('demo-'))
      ? `${window.location.origin}/post/${currentReel._id}`
      : window.location.href;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Reel share link copied to clipboard!');
    } else {
      toast.info('Share URL: ' + shareUrl);
    }
  };

  const handleUploadReel = async (e) => {
    e.preventDefault();
    if (!requireAuth('upload reels')) return;
    if (!uploadVideoFile) {
      toast.error('Please select a video file');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('content', uploadCaption || 'New Workout Reel 🔥');
    formData.append('media', uploadVideoFile);

    try {
      const created = await postService.createPost(formData);
      created.author = { name: currentUserName };
      created.likes = [];
      created.comments = [];
      setReels([created, ...reels]);
      setCurrentIndex(0);
      setShowUploadModal(false);
      setUploadVideoFile(null);
      setUploadCaption('');
      toast.success('Reel uploaded and published!');
    } catch (err) {
      toast.error(err.message || 'Failed to upload reel');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="reels-page-container">
        <LoadingSpinner size="large" message="Loading GymSync reels..." />
      </div>
    );
  }

  const isLikedByMe = (currentReel?.likes || []).includes(currentUserName);
  const currentAuthor = currentReel?.authorName || currentReel?.author?.name || 'Athlete';
  const isFollowingAuthor = Boolean(followingMap[currentAuthor]);
  const isCurrentGif = currentReel ? isGifUrl(currentReel.mediaUrl) : false;

  return (
    <div className="reels-page-container">
      {/* Desktop Helper Header (Never overlaps Navbar) */}
      <div className="reels-desktop-header">
        <div className="reels-header-badge">
          <Film size={16} /> GymSync Reels
        </div>
        <div className="reels-header-actions">
          <span className="reels-index-pill">
            {currentIndex + 1} / {reels.length}
          </span>
          <button
            onClick={() => {
              if (!requireAuth('upload reels')) return;
              setShowUploadModal(true);
            }}
            className="reels-upload-header-btn"
          >
            <Plus size={16} /> Upload Reel
          </button>
        </div>
      </div>

      <div 
        className="reels-wrapper"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Desktop Side Navigation Buttons */}
        <button 
          className="reel-nav-btn reel-nav-prev" 
          onClick={handlePrev} 
          title="Previous Reel (Up Arrow / Scroll Up)"
          aria-label="Previous Reel"
        >
          <ChevronUp size={24} />
        </button>

        {/* Video Reel Player Card */}
        {currentReel && (
          <div className="reel-card" onClick={handleDoubleTap}>
            {/* Ambient Blurred Video Background */}
            {!isCurrentGif && !videoError ? (
              <video
                src={currentReel.mediaUrl}
                className="reel-video-ambient"
                loop
                autoPlay
                playsInline
                muted
                aria-hidden="true"
              />
            ) : (
              <div 
                className="reel-ambient-fallback"
                style={{
                  backgroundImage: currentReel.posterUrl ? `url(${currentReel.posterUrl})` : undefined
                }}
              />
            )}

            {/* Main Video or GIF Media */}
            {isCurrentGif ? (
              <img
                src={currentReel.mediaUrl}
                alt={currentReel.content || 'Workout Reel'}
                className="reel-video-main"
                onError={() => setVideoError(true)}
              />
            ) : (
              <video
                ref={videoRef}
                src={currentReel.mediaUrl}
                poster={currentReel.posterUrl}
                className="reel-video-main"
                loop
                autoPlay
                playsInline
                muted={isMuted}
                onError={() => setVideoError(true)}
              />
            )}

            {/* Double Tap Heart Burst Animation */}
            {doubleTapHeart && (
              <div className="reel-heart-burst">
                <Dumbbell size={80} color="#ec4899" fill="#ec4899" />
              </div>
            )}

            {/* Play/Pause Overlay Indicator when paused */}
            {!isPlaying && !isCurrentGif && (
              <div 
                className="reel-pause-indicator"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
              >
                <Play size={36} style={{ marginLeft: '4px' }} />
              </div>
            )}

            {/* Quick Unmute Hint Pill */}
            {isMuted && showMuteHint && !isCurrentGif && (
              <div 
                className="reel-mute-hint-pill"
                onClick={toggleMute}
              >
                <VolumeX size={14} /> Tap to unmute
              </div>
            )}

            {/* Video Overlay UI Controls & Info */}
            <div className="reel-overlay">
              {/* Top Bar inside Video */}
              <div className="reel-top-bar" onClick={e => e.stopPropagation()}>
                <div className="reel-badge">
                  <Film size={13} /> GymSync Reel
                </div>

                <div className="reel-top-right-group">
                  <button
                    onClick={() => {
                      if (!requireAuth('upload reels')) return;
                      setShowUploadModal(true);
                    }}
                    className="reel-mobile-upload-btn"
                    title="Upload Reel"
                  >
                    <Plus size={15} /> Upload
                  </button>

                  {!isCurrentGif && (
                    <button 
                      onClick={toggleMute}
                      className="reel-sound-toggle-btn"
                      title={isMuted ? 'Unmute' : 'Mute'}
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Right Side Interaction Column (Like, Comment, Share) */}
              <div className="reel-actions-column" onClick={e => e.stopPropagation()}>
                {/* Like Button with Dumbbell Icon */}
                <button 
                  className={`reel-action-btn ${isLikedByMe ? 'liked' : ''}`}
                  onClick={() => handleLike()}
                  title={isLikedByMe ? 'Unlike' : 'Like'}
                  aria-label="Like Reel"
                >
                  <div className="reel-icon-circle">
                    <Dumbbell size={22} className={isLikedByMe ? 'icon-liked' : ''} />
                  </div>
                  <span className="reel-count-label">{currentReel.likes?.length || 0}</span>
                </button>

                {/* Comment Button */}
                <button 
                  className="reel-action-btn"
                  onClick={() => setShowComments(!showComments)}
                  title="Comments"
                  aria-label="Comments"
                >
                  <div className="reel-icon-circle">
                    <MessageCircle size={22} />
                  </div>
                  <span className="reel-count-label">{currentReel.comments?.length || 0}</span>
                </button>

                {/* Share Button */}
                <button 
                  className="reel-action-btn"
                  onClick={handleShare}
                  title="Share Reel Link"
                  aria-label="Share Reel Link"
                >
                  <div className="reel-icon-circle">
                    <Share2 size={20} />
                  </div>
                  <span className="reel-count-label">Share</span>
                </button>
              </div>

              {/* Bottom Caption Info */}
              <div className="reel-bottom-info" onClick={e => e.stopPropagation()}>
                <div className="reel-author-row">
                  <Link 
                    to={`/profile/${currentAuthor}`} 
                    className="reel-author-link"
                  >
                    <UserAvatar name={currentAuthor} size={36} />
                    <span className="reel-author-name">{currentAuthor}</span>
                  </Link>

                  {currentAuthor !== currentUserName && currentAuthor !== 'Athlete' && (
                    <button
                      type="button"
                      className={`reel-follow-btn ${isFollowingAuthor ? 'following' : ''}`}
                      onClick={(e) => handleToggleFollow(currentAuthor, e)}
                    >
                      {isFollowingAuthor ? (
                        <>
                          <UserCheck size={12} /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={12} /> Follow
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p 
                  className="reel-caption-text" 
                  onClick={() => setExpandedCaption(!expandedCaption)}
                  style={{ 
                    WebkitLineClamp: expandedCaption ? 'unset' : 2,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                  title="Click to expand or collapse"
                >
                  {currentReel.content}
                </p>
                {currentReel.content && currentReel.content.length > 80 && (
                  <span 
                    className="reel-caption-toggle"
                    onClick={() => setExpandedCaption(!expandedCaption)}
                  >
                    {expandedCaption ? 'Show less' : '...more'}
                  </span>
                )}
              </div>
            </div>

            {/* Sliding Comments Drawer */}
            {showComments && (
              <div className="reels-comments-drawer" onClick={e => e.stopPropagation()}>
                <div className="reels-comments-header">
                  <div className="reels-comments-drag-handle" />
                  <div className="reels-comments-title">
                    <MessageCircle size={16} /> Comments ({currentReel.comments?.length || 0})
                  </div>
                  <button 
                    onClick={() => setShowComments(false)}
                    className="reels-comments-close-btn"
                    aria-label="Close comments"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="reels-comments-list">
                  {(currentReel.comments || []).length === 0 ? (
                    <div className="reels-comments-empty">
                      No comments yet. Be the first athlete to cheer them on!
                    </div>
                  ) : (
                    currentReel.comments.map((c, i) => (
                      <div key={c._id || i} className="reel-comment-item">
                        <strong className="reel-comment-author">
                          {(typeof c.author === 'object' ? c.author?.name : c.author) || 'Athlete'}
                        </strong>
                        <p className="reel-comment-text">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="reels-comment-form">
                  <input
                    type="text"
                    placeholder="Add a workout comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    className="reels-comment-input"
                  />
                  <button
                    type="submit"
                    className="reels-comment-submit-btn"
                    aria-label="Send comment"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Desktop Side Navigation Buttons */}
        <button 
          className="reel-nav-btn reel-nav-next" 
          onClick={handleNext} 
          title="Next Reel (Down Arrow / Scroll Down)"
          aria-label="Next Reel"
        >
          <ChevronDown size={24} />
        </button>
      </div>

      {/* Upload Reel Modal */}
      {showUploadModal && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
          onClick={() => setShowUploadModal(false)}
        >
          <div 
            className="modal-content glass-panel" 
            style={{ 
              maxWidth: '480px', 
              width: '92%', 
              borderRadius: '20px', 
              padding: '24px', 
              background: 'var(--card-bg, #111827)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
              border: '1px solid rgba(255,255,255,0.12)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film size={22} color="#ec4899" />
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>Upload Workout Reel</h3>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)} 
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadReel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Select Video File (MP4, WebM, MOV) *
                </label>
                <input
                  type="file"
                  accept="video/*"
                  required
                  onChange={e => setUploadVideoFile(e.target.files?.[0] || null)}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    borderRadius: '10px', 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.15)', 
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                />
                {uploadVideoFile && (
                  <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'block', marginTop: '6px' }}>
                    Selected: {uploadVideoFile.name} ({(uploadVideoFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>
                  Reel Caption & Hashtags
                </label>
                <textarea
                  rows={3}
                  placeholder="E.g., Hit a new PR on squats today! 🏋️‍♂️ #legday #gains"
                  value={uploadCaption}
                  onChange={e => setUploadCaption(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    borderRadius: '10px', 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.15)', 
                    color: '#fff', 
                    resize: 'none',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isUploading}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  marginTop: '6px',
                  border: 'none',
                  color: '#fff',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)'
                }}
              >
                {isUploading ? 'Uploading Video...' : 'Publish Reel to Feed'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelsPage;
