import Suggestion from '../models/Suggestion.js';

// @desc    Get dynamic suggestions for Home page
// @route   GET /api/suggestions
// @access  Public
export const getSuggestions = async (req, res) => {
  try {
    // In a real app, this would randomly sample or use an algorithm.
    // For FYP, we fetch the latest suggestions created by admin.
    const suggestions = await Suggestion.find().sort({ createdAt: -1 }).limit(5);
    
    // If empty (no admin data yet), return smart defaults so the UI doesn't break
    if (suggestions.length === 0) {
      return res.json([
        { _id: '1', type: 'Gym', title: 'Iron Core Fitness', description: 'Top rated gym near you.', linkId: 'gym1' },
        { _id: '2', type: 'Product', title: 'Whey Protein Isolate', description: '20% off today.', linkId: 'prod1' }
      ]);
    }
    
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
