/**
 * Deterministic Social Feed Ranking Algorithm for GymSync
 * Scores and prioritizes posts based on recency, relationship, engagement, and freshness.
 */

export const calculatePostScore = (post, options = {}) => {
  const {
    currentUserName = '',
    userFriends = [],
    userFollowing = [],
    seenPostIds = []
  } = options;

  let score = 0;
  const authorName = post.authorName || post.author?.name || '';
  const isOwnPost = authorName === currentUserName;
  const isFriend = Array.isArray(userFriends) && userFriends.includes(authorName);
  const isFollowing = Array.isArray(userFollowing) && userFollowing.includes(authorName);

  // 1. Recency Signal (Higher score for newer posts)
  const createdAt = post.createdAt ? new Date(post.createdAt).getTime() : Date.now();
  const hoursOld = Math.max(0, (Date.now() - createdAt) / (1000 * 60 * 60));
  const recencyScore = Math.max(0, 100 - hoursOld * 2.5); // Decay over ~40 hours
  score += recencyScore;

  // 2. Relationship Signal
  if (isOwnPost) {
    score += 40;
  } else if (isFriend) {
    score += 50;
  } else if (isFollowing) {
    score += 30;
  }

  // 3. Engagement Signal (Capped at 50 to prevent 1 viral post from dominating)
  const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
  const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;
  const engagementScore = Math.min(50, likesCount * 3 + commentsCount * 5);
  score += engagementScore;

  // 4. Freshness / Unseen Bonus
  const isSeen = Array.isArray(seenPostIds) && seenPostIds.includes(post._id);
  if (!isSeen) {
    score += 15;
  } else {
    score -= 25; // Soft penalty for already-seen posts without hiding them permanently
  }

  return score;
};

export const rankFeedPosts = (posts = [], options = {}) => {
  if (!Array.isArray(posts)) return [];

  const scoredPosts = posts.map(post => ({
    post,
    score: calculatePostScore(post, options)
  }));

  // Sort descending by score; fallback to createdAt tie-breaker
  scoredPosts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = new Date(a.post.createdAt || 0).getTime();
    const timeB = new Date(b.post.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return scoredPosts.map(item => item.post);
};
