import User from '../../models/User.js';
import Post from '../../models/Post.js';

/**
 * workoutBuddyFinder
 * Searches PUBLIC profiles and PUBLIC posts for workout buddy matching.
 * Strict Privacy Guarantee (Rule 5.2):
 * - NEVER queries or returns private bioData, weight, height, dob, gender,
 *   medical acknowledgments, food logs, private messages, or contact details.
 * - Enforces hard projection whitelist on every database query and sanitizes results.
 */

// Whitelist of strictly safe, public user fields
export const SAFE_PUBLIC_USER_FIELDS = [
  '_id',
  'id',
  'name',
  'username',
  'profilePic',
  'city',
  'subscribedGymName',
  'fitnessGoal',
  'bio'
];

// Whitelist of strictly safe, public post fields
export const SAFE_PUBLIC_POST_FIELDS = [
  '_id',
  'id',
  'authorName',
  'authorRole',
  'gymName',
  'content',
  'postType',
  'createdAt'
];

/**
 * Sanitizes a user profile object by stripping all non-whitelisted fields.
 * Any private field (weight, height, dob, gender, medical, email, phone, otp, etc.)
 * is stripped guaranteed.
 */
export const sanitizePublicProfile = (userObj) => {
  if (!userObj) return null;
  const raw = typeof userObj.toObject === 'function' ? userObj.toObject() : { ...userObj };
  const safe = {};
  
  for (const field of SAFE_PUBLIC_USER_FIELDS) {
    if (raw[field] !== undefined) {
      safe[field] = raw[field];
    }
  }

  // Ensure ID and username are represented cleanly
  if (raw._id) safe.id = String(raw._id);
  if (!safe.username && raw.name) {
    safe.username = raw.name.toLowerCase().replace(/\s+/g, '_');
  }

  // Explicit safety assert: Ensure NO private fields leak
  delete safe.bioData;
  delete safe.weight;
  delete safe.height;
  delete safe.dob;
  delete safe.gender;
  delete safe.email;
  delete safe.phone;
  delete safe.password;
  delete safe.otpCode;
  delete safe.disclaimerAcceptedAt;
  delete safe.disclaimerVersion;
  delete safe.medicalWarningAcknowledged;
  delete safe.messages;
  delete safe.foodLogs;

  return safe;
};

/**
 * Sanitizes a public post object ensuring only whitelisted fields are present.
 */
export const sanitizePublicPost = (postObj) => {
  if (!postObj) return null;
  const raw = typeof postObj.toObject === 'function' ? postObj.toObject() : { ...postObj };
  const safe = {};

  for (const field of SAFE_PUBLIC_POST_FIELDS) {
    if (raw[field] !== undefined) {
      safe[field] = raw[field];
    }
  }

  if (raw._id) safe.id = String(raw._id);
  return safe;
};

/**
 * Escape regex helper
 */
const escapeRegex = (str) => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const workoutBuddyFinder = {
  /**
   * Find public members and community posts looking for workout partners / buddies
   */
  async findWorkoutBuddies({ query = '', city = '', gymName = '', goal = '', currentUserId = null, limit = 5 } = {}) {
    const results = {
      buddies: [],
      communityPosts: [],
      sourceAttribution: {
        sourceType: 'community',
        sourceTitle: 'GymSync Community Members & Public Posts'
      }
    };

    try {
      // 1. Search PUBLIC Profiles
      const userFilter = {
        role: 'User',
        isDeleted: { $ne: true },
        $or: [
          { accountStatus: 'Active' },
          { accountStatus: { $exists: false } },
          { accountStatus: null }
        ]
      };

      if (currentUserId) {
        userFilter._id = { $ne: currentUserId };
      }

      const conditions = [];

      if (city) {
        conditions.push({ city: new RegExp(escapeRegex(city), 'i') });
      }
      if (gymName) {
        conditions.push({ subscribedGymName: new RegExp(escapeRegex(gymName), 'i') });
      }
      if (goal && goal !== 'General Fitness' && goal !== 'General') {
        conditions.push({ fitnessGoal: new RegExp(escapeRegex(goal), 'i') });
      }

      if (query && query.trim()) {
        const qClean = query.trim();
        const stopWords = /^(workout|buddy|buddies|partner|partners|find|looking|gym|with|need|want|chahiye|mera|meri|karo|batao|for|in|near|the|and|me|a|an|to)$/i;
        const words = qClean.split(/[\s,?.!]+/).filter(w => w.length >= 3 && !stopWords.test(w));
        if (words.length > 0 && !city && !gymName && !goal) {
          const wordBranches = [];
          words.forEach(w => {
            const rx = new RegExp(escapeRegex(w), 'i');
            wordBranches.push(
              { city: rx },
              { subscribedGymName: rx },
              { fitnessGoal: rx },
              { bio: rx }
            );
          });
          conditions.push({ $or: wordBranches });
        }
      }

      if (conditions.length > 0) {
        userFilter.$and = conditions;
      }

      // Query database with strict projection whitelist (NEVER select bioData, emails, etc.)
      const publicProjection = SAFE_PUBLIC_USER_FIELDS.reduce((acc, f) => {
        acc[f] = 1;
        return acc;
      }, {});

      const candidateUsers = await User.find(userFilter, publicProjection)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();

      results.buddies = candidateUsers.map(sanitizePublicProfile).filter(Boolean);

      // 2. Search PUBLIC Community Posts for buddy / partner requests
      const postFilter = {
        approvalStatus: 'published',
        viewRestriction: 'AllUsers',
        content: new RegExp('(?:buddy|partner|spotter|training partner|workout partner|kasrat partner|dost)', 'i')
      };

      const postProjection = SAFE_PUBLIC_POST_FIELDS.reduce((acc, f) => {
        acc[f] = 1;
        return acc;
      }, {});

      const posts = await Post.find(postFilter, postProjection)
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      results.communityPosts = posts.map(sanitizePublicPost).filter(Boolean);

    } catch (err) {
      console.warn('workoutBuddyFinder.findWorkoutBuddies error:', err.message);
    }

    return results;
  },

  /**
   * Search general published public posts for AI context questions
   */
  async findRelevantPublicPosts({ query = '', gymId = null, limit = 4 } = {}) {
    try {
      const filter = {
        approvalStatus: 'published',
        viewRestriction: 'AllUsers'
      };

      if (gymId) {
        filter.gymId = gymId;
      }

      if (query && query.trim()) {
        const qClean = query.trim();
        const rx = new RegExp(escapeRegex(qClean), 'i');
        filter.$or = [
          { content: rx },
          { gymName: rx },
          { authorName: rx }
        ];
      }

      const postProjection = SAFE_PUBLIC_POST_FIELDS.reduce((acc, f) => {
        acc[f] = 1;
        return acc;
      }, {});

      const posts = await Post.find(filter, postProjection)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return posts.map(sanitizePublicPost).filter(Boolean);
    } catch (err) {
      console.warn('workoutBuddyFinder.findRelevantPublicPosts error:', err.message);
      return [];
    }
  }
};

export default workoutBuddyFinder;
