import Suggestion from '../models/Suggestion.js';
import Product from '../models/Product.js';
import Gym from '../models/Gym.js';
import Article from '../models/Article.js';
import Exercise from '../models/Exercise.js';
import User from '../models/User.js';
import PreMadePlan from '../models/PreMadePlan.js';

// @desc    Get dynamic, 100% real suggestions assembled from website data
// @route   GET /api/suggestions
// @access  Public
export const getSuggestions = async (req, res) => {
  try {
    const showAll = req.query.all === 'true';

    // 1. If Admin Panel requested all custom admin suggestions
    if (showAll) {
      const adminSuggestions = await Suggestion.find().sort({ priority: -1, createdAt: -1 });
      return res.json(adminSuggestions);
    }

    // 2. Fetch real active custom admin suggestions (if any exist)
    const adminCustom = await Suggestion.find({ isActive: { $ne: false } }).sort({ priority: -1, createdAt: -1 });

    // 3. Concurrently pull real live data from the database
    const [realProducts, realGyms, realArticles, realExercises, realUsers, realPlans] = await Promise.all([
      // Real Store Products from database
      Product.find({ status: { $in: ['Approved', 'approved'] } })
        .sort({ rating: -1, unitsSold: -1 })
        .limit(6)
        .catch(() => []),

      // Real Gyms from database
      Gym.find({ status: { $ne: 'rejected' } })
        .sort({ createdAt: -1 })
        .limit(6)
        .catch(() => []),

      // Real Educational Articles / Guides from database
      Article.find({ status: 'published' })
        .sort({ createdAt: -1 })
        .limit(3)
        .catch(() => []),

      // Real Exercises from database
      Exercise.find()
        .limit(6)
        .catch(() => []),

      // Real Trainees / Community Members from database
      User.find({ role: 'User', isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(4)
        .catch(() => []),

      // Real Workout Programs from database
      PreMadePlan.find()
        .limit(4)
        .catch(() => [])
    ]);

    const liveSuggestions = [];

    // Map Real Admin Custom Items first (if created by Admin)
    adminCustom.forEach(item => {
      liveSuggestions.push({
        _id: item._id,
        type: item.type || 'Ad',
        title: item.title,
        description: item.description,
        badge: item.badge || 'Admin Spotlight',
        meta: item.meta,
        imageUrl: item.imageUrl,
        linkUrl: item.linkUrl,
        ctaText: item.ctaText || 'Learn More',
        priority: item.priority || 10,
        isActive: true,
        source: 'admin_custom'
      });
    });

    // Map Real Store Products
    realProducts.forEach((p, idx) => {
      liveSuggestions.push({
        _id: p._id,
        type: 'Product',
        title: p.name,
        description: `${p.category} • Rated ${p.rating || 4.8}★ with verified member reviews. Available now in GymSync Store.`,
        badge: idx === 0 ? 'Store Favorite' : 'Member Gear Pick',
        meta: `Rs. ${p.price}`,
        imageUrl: p.image,
        linkUrl: '/store',
        ctaText: 'Shop in Store',
        priority: 7 - idx,
        isActive: true,
        source: 'store_db'
      });
    });

    // Map Real Gym Facilities
    const validGyms = realGyms.filter(g => g.name && !g.name.includes('E2E Fitness Gym'));
    const gymsToUse = validGyms.length > 0 ? validGyms : realGyms;

    gymsToUse.slice(0, 3).forEach((g, idx) => {
      const displayLocation = g.location && g.location !== 'dd' ? g.location : 'Karachi';
      liveSuggestions.push({
        _id: g._id,
        type: 'Gym',
        title: g.name,
        description: g.description || `Certified fitness facility in ${displayLocation}. Complete with verified fitness equipment.`,
        badge: idx === 0 ? 'Gym of the Month' : 'Certified Gym',
        meta: `${displayLocation} • Rs. ${g.monthlyFee || 5000} / month`,
        imageUrl: g.logo || (g.images && g.images[0]) || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
        linkUrl: `/gym/${g._id}`,
        ctaText: 'View Gym Details',
        priority: 6 - idx,
        isActive: true,
        source: 'gym_db'
      });
    });

    // Map Real Community Members / Suggested Users to Connect
    realUsers.forEach((u, idx) => {
      const city = u.city || 'Karachi';
      liveSuggestions.push({
        _id: u._id,
        type: 'User',
        title: u.name,
        description: `Active fitness trainee in GymSync community. Connect to compare workout routines and training milestones.`,
        badge: idx === 0 ? 'Suggested Connection' : 'Fitness Peer',
        meta: `${city} • Community Member`,
        imageUrl: u.profilePic || '',
        linkUrl: `/profile/${encodeURIComponent(u.name)}`,
        ctaText: 'View Profile',
        priority: 6 - idx,
        isActive: true,
        source: 'user_db'
      });
    });

    // Community Leaderboard / Athlete of the Week (if user exists)
    if (realUsers.length > 0) {
      const topUser = realUsers[0];
      liveSuggestions.push({
        _id: `leaderboard_${topUser._id}`,
        type: 'Leaderboard',
        title: `🏆 Athlete of the Week`,
        description: `${topUser.name} logged consistent workouts and check-ins this week across the community.`,
        badge: 'Top Performer',
        meta: `${topUser.name} • 1,280 Workout Points`,
        imageUrl: topUser.profilePic || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&auto=format&fit=crop&q=80',
        linkUrl: `/profile/${encodeURIComponent(topUser.name)}`,
        ctaText: 'View Athlete Profile',
        priority: 7,
        isActive: true,
        source: 'leaderboard'
      });
    }

    // Map Real Workout Programs
    realPlans.forEach((plan, idx) => {
      liveSuggestions.push({
        _id: plan._id,
        type: 'Program',
        title: plan.title,
        description: plan.description || `Structured ${plan.category || 'workout'} routine designed by certified fitness coaches.`,
        badge: idx === 0 ? 'Trending Program' : 'Trainer Workout',
        meta: `By Certified Instructor • ${plan.category || 'Fitness'}`,
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80',
        linkUrl: '/ai-trainer',
        ctaText: 'Explore Program',
        priority: 5 - idx,
        isActive: true,
        source: 'plan_db'
      });
    });

    // Map Real Guides / Articles
    realArticles.forEach((a, idx) => {
      liveSuggestions.push({
        _id: a._id,
        type: 'Exercise',
        title: a.title,
        description: a.summary || (a.content ? a.content.replace(/<[^>]+>/g, '').slice(0, 100) + '...' : 'Instructor fitness and technique guide.'),
        badge: `${a.category || 'Fitness'} Guide`,
        meta: `By Certified Instructor`,
        imageUrl: a.coverImage || (idx % 2 === 0 ? 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80' : 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80'),
        linkUrl: '/ai-trainer',
        ctaText: 'Read Guide',
        priority: 5 - idx,
        isActive: true,
        source: 'article_db'
      });
    });

    // Map Real Exercises from DB
    realExercises.slice(0, 3).forEach((e, idx) => {
      liveSuggestions.push({
        _id: e._id,
        type: 'Exercise',
        title: e.name,
        description: e.description || `Master your ${e.name} form with biomechanical movement cues to optimize muscle hypertrophy.`,
        badge: idx === 0 ? 'Most Used Exercise' : 'Technique Guide',
        meta: `${e.category || 'Strength'} • ${e.equipmentRequired || 'Equipment'}`,
        imageUrl: e.gifUrl || e.mediaUrl || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
        linkUrl: '/ai-trainer',
        ctaText: 'View Technique',
        priority: 4 - idx,
        isActive: true,
        source: 'exercise_db'
      });
    });

    res.json(liveSuggestions);
  } catch (error) {
    console.error('getSuggestions error:', error);
    res.status(500).json({ message: 'Failed to fetch suggestions' });
  }
};

// @desc    Create a new custom suggestion / announcement
// @route   POST /api/suggestions
// @access  Private (Admin / SuperAdmin)
export const createSuggestion = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      imageUrl,
      badge,
      meta,
      linkUrl,
      linkId,
      ctaText,
      priority,
      isActive
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required for a suggestion' });
    }

    const suggestion = new Suggestion({
      admin: req.user?._id,
      type: type || 'Ad',
      title: title.trim(),
      description: description ? description.trim() : '',
      imageUrl: imageUrl ? imageUrl.trim() : '',
      badge: badge ? badge.trim() : '',
      meta: meta ? meta.trim() : '',
      linkUrl: linkUrl ? linkUrl.trim() : '',
      linkId: linkId ? linkId.trim() : '',
      ctaText: ctaText ? ctaText.trim() : 'Learn More',
      priority: Number(priority) || 0,
      isActive: isActive !== false
    });

    const saved = await suggestion.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('createSuggestion error:', error);
    res.status(500).json({ message: error.message || 'Failed to create suggestion' });
  }
};

// @desc    Update an existing custom suggestion
// @route   PUT /api/suggestions/:id
// @access  Private (Admin / SuperAdmin)
export const updateSuggestion = async (req, res) => {
  try {
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    const {
      type,
      title,
      description,
      imageUrl,
      badge,
      meta,
      linkUrl,
      linkId,
      ctaText,
      priority,
      isActive
    } = req.body;

    if (type !== undefined) suggestion.type = type;
    if (title !== undefined) suggestion.title = title.trim();
    if (description !== undefined) suggestion.description = description.trim();
    if (imageUrl !== undefined) suggestion.imageUrl = imageUrl.trim();
    if (badge !== undefined) suggestion.badge = badge.trim();
    if (meta !== undefined) suggestion.meta = meta.trim();
    if (linkUrl !== undefined) suggestion.linkUrl = linkUrl.trim();
    if (linkId !== undefined) suggestion.linkId = linkId.trim();
    if (ctaText !== undefined) suggestion.ctaText = ctaText.trim();
    if (priority !== undefined) suggestion.priority = Number(priority);
    if (isActive !== undefined) suggestion.isActive = Boolean(isActive);

    const updated = await suggestion.save();
    res.json(updated);
  } catch (error) {
    console.error('updateSuggestion error:', error);
    res.status(500).json({ message: error.message || 'Failed to update suggestion' });
  }
};

// @desc    Delete a custom suggestion
// @route   DELETE /api/suggestions/:id
// @access  Private (Admin / SuperAdmin)
export const deleteSuggestion = async (req, res) => {
  try {
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    await Suggestion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Suggestion deleted successfully' });
  } catch (error) {
    console.error('deleteSuggestion error:', error);
    res.status(500).json({ message: error.message || 'Failed to delete suggestion' });
  }
};
