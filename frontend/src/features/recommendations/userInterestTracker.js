/**
 * GymSync User Interest Tracker & Recommendation Engine
 * Mimics social media algorithms (FB, Instagram, TikTok) to track user activity,
 * calculate interest affinities, and deliver personalized suggestions.
 */

const STORAGE_KEY = 'gymsync_user_interest_profile';
const SESSION_CACHE_KEY = 'gymsync_active_recommendation_cache';

// Default baseline interest profile
const DEFAULT_PROFILE = {
  scores: {
    strength: 5,
    nutrition: 4,
    gyms: 4,
    cardio: 2,
    facility_ops: 1
  },
  lastCategory: 'strength',
  recentActions: [],
  updatedAt: Date.now()
};

/**
 * Get current stored interest profile
 */
export const getUserInterestProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      scores: { ...DEFAULT_PROFILE.scores, ...(parsed.scores || {}) },
      lastCategory: parsed.lastCategory || 'strength',
      recentActions: Array.isArray(parsed.recentActions) ? parsed.recentActions : [],
      updatedAt: parsed.updatedAt || Date.now()
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
};

/**
 * Save updated interest profile
 */
const saveUserInterestProfile = (profile) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...profile,
      updatedAt: Date.now()
    }));
  } catch (err) {
    console.warn('Could not save user interest profile:', err);
  }
};

/**
 * Track an explicit interest interaction
 * @param {string} category - 'strength' | 'nutrition' | 'gyms' | 'cardio' | 'facility_ops'
 * @param {number} weight - Signal strength (1-5)
 * @param {string} actionName - Optional action description
 */
export const trackInterest = (category, weight = 2, actionName = '') => {
  if (!category) return;
  const profile = getUserInterestProfile();

  const currentScore = profile.scores[category] || 0;
  profile.scores[category] = currentScore + weight;
  profile.lastCategory = category;

  if (actionName) {
    profile.recentActions = [
      { category, action: actionName, timestamp: Date.now() },
      ...profile.recentActions.slice(0, 9)
    ];
  }

  saveUserInterestProfile(profile);
};

/**
 * Automatically track user route navigation to deduce current intent
 * @param {string} pathname
 * @param {string} userRole
 */
export const trackPageIntent = (pathname = '', userRole = '') => {
  const path = pathname.toLowerCase();
  const normalizedRole = (userRole || '').toLowerCase().replace(/[_\s]/g, '');

  if (normalizedRole === 'gymowner') {
    trackInterest('facility_ops', 2, 'Facility Management Context');
  }

  if (path.includes('/store')) {
    trackInterest('nutrition', 3, 'Browsing Store / Nutrition');
  } else if (path.includes('/explore') || path.includes('/gym/')) {
    trackInterest('gyms', 3, 'Exploring Gym Facilities');
  } else if (path.includes('/ai-trainer') || path.includes('/exercises') || path.includes('/programs')) {
    trackInterest('strength', 3, 'Workout & Exercise Tracking');
  } else if (path.includes('/running') || path.includes('/cardio')) {
    trackInterest('cardio', 3, 'Cardio & Running Session');
  } else if (path.includes('/diet') || path.includes('/nutrition')) {
    trackInterest('nutrition', 3, 'Diet & Meal Planning');
  }
};

/**
 * Track post engagement by analyzing content keywords
 * @param {string} content
 */
export const trackPostKeywords = (content = '') => {
  if (!content || typeof content !== 'string') return;
  const text = content.toLowerCase();

  if (/chest|bench|squat|deadlift|bicep|tricep|muscle|reps|sets|lifting|weights/i.test(text)) {
    trackInterest('strength', 2, 'Engaged with Strength Post');
  }
  if (/protein|creatine|diet|whey|carbs|calories|nutrition|meal|shake/i.test(text)) {
    trackInterest('nutrition', 2, 'Engaged with Nutrition Post');
  }
  if (/gym|branch|membership|trainer|facility|sauna|locker/i.test(text)) {
    trackInterest('gyms', 2, 'Engaged with Gym Post');
  }
  if (/run|running|cardio|stamina|hiit|5k|10k|treadmill/i.test(text)) {
    trackInterest('cardio', 2, 'Engaged with Cardio Post');
  }
};

/**
 * Generate a ranked list of organic recommendations based on user interest
 * Ranked by affinity score so rotation presents the most relevant items first.
 */
export const getPersonalizedRecommendationsList = ({
  suggestions = [],
  fallbackGym = null,
  fallbackProduct = null,
  userRole = ''
}) => {
  const normalizedRole = (userRole || '').toLowerCase().replace(/[_\s]/g, '');
  const isGymOwner = normalizedRole === 'gymowner';
  const isGymTrainer = normalizedRole === 'gymtrainer';

  // 1. Filter out any Ads (user explicitly requested no fake sponsored ads)
  const validSuggestions = suggestions.filter(s => s && s.type !== 'Ad' && s.isActive !== false);

  // 2. Read interest scores
  const profile = getUserInterestProfile();
  const scores = { ...(profile.scores || {}) };

  if (isGymOwner) {
    scores.facility_ops = (scores.facility_ops || 0) + 10;
  }
  if (isGymTrainer) {
    scores.strength = (scores.strength || 0) + 8;
  }

  // Find user's top category
  let topCategory = 'strength';
  let maxScore = -1;
  Object.entries(scores).forEach(([cat, score]) => {
    if (score > maxScore) {
      maxScore = score;
      topCategory = cat;
    }
  });

  // Separate live suggestions by genuine database type
  const adminItems = validSuggestions.filter(s => s.source === 'admin_custom');
  const products = validSuggestions.filter(s => s.type === 'Product');
  const gyms = validSuggestions.filter(s => s.type === 'Gym');
  const guides = validSuggestions.filter(s => s.type === 'Exercise');
  const users = validSuggestions.filter(s => s.type === 'User');
  const leaderboard = validSuggestions.filter(s => s.type === 'Leaderboard');
  const programs = validSuggestions.filter(s => s.type === 'Program');

  // Determine priority pools based on user interest affinity
  let primaryPools = [];
  if (topCategory === 'nutrition') {
    primaryPools = [products, programs, guides, gyms, users, leaderboard];
  } else if (topCategory === 'gyms') {
    primaryPools = [gyms, users, programs, guides, products, leaderboard];
  } else {
    // strength / cardio / default
    primaryPools = [guides, programs, users, leaderboard, gyms, products];
  }

  // Put admin spotlights first if any exist
  const candidates = [...adminItems];
  const addedIds = new Set(adminItems.map(i => String(i._id || i.title)));

  // Interleave across pools
  const maxPoolLen = Math.max(
    products.length,
    gyms.length,
    guides.length,
    users.length,
    programs.length,
    leaderboard.length,
    1
  );

  for (let i = 0; i < maxPoolLen; i++) {
    primaryPools.forEach(pool => {
      if (pool[i]) {
        const item = pool[i];
        const id = String(item._id || item.title);
        if (!addedIds.has(id)) {
          candidates.push(item);
          addedIds.add(id);
        }
      }
    });
  }

  // Fallback if pool is empty
  if (candidates.length === 0 && fallbackProduct) {
    candidates.push({
      _id: fallbackProduct._id || fallbackProduct.id,
      type: 'Product',
      title: fallbackProduct.name,
      badge: 'Recommended Gear',
      meta: `Rs. ${fallbackProduct.price}`,
      description: `${fallbackProduct.category || 'Fitness'} • Available in GymSync Store.`,
      imageUrl: fallbackProduct.image || '',
      linkUrl: '/store',
      ctaText: 'Shop in Store'
    });
  }

  if (candidates.length < 2 && fallbackGym) {
    candidates.push({
      _id: fallbackGym._id || fallbackGym.id,
      type: 'Gym',
      title: fallbackGym.name,
      badge: 'Nearby Facility',
      meta: fallbackGym.location ? `${fallbackGym.location} • Rs. ${fallbackGym.monthlyFee || 5000}/mo` : `Rs. ${fallbackGym.monthlyFee || 5000}/mo`,
      description: `Certified fitness facility in ${fallbackGym.location || 'your area'}.`,
      imageUrl: fallbackGym.logo || fallbackGym.images?.[0] || '',
      linkUrl: `/gym/${fallbackGym._id || fallbackGym.id}`,
      ctaText: 'View Gym Details'
    });
  }

  return candidates;
};

/**
 * Select single top recommendation (convenience wrapper)
 */
export const selectPersonalizedRecommendation = (params) => {
  const list = getPersonalizedRecommendationsList(params);
  return list.length > 0 ? list[0] : null;
};

