import Gym from '../models/Gym.js';

// @desc    Get gym details for a specific user's membership
// @route   GET /api/gyms/my-gym/:userId
// @access  Private
export const getMyGym = async (req, res) => {
  try {
    // We would normally look up User.gymMembership, but for FYP simplicity
    // we fetch any gym or a default structure if none exist.
    let gym = await Gym.findOne();
    
    if (!gym) {
      // Mock fallback ONLY if the DB is literally completely empty 
      // so the UI doesn't crash before the user sets up data.
      return res.json({
        _id: 'mock_gym',
        name: "Elite Fitness Studio",
        todayTrainingTip: {
          today: "Focus on heavy compound lifts. 4 sets of 8 reps.",
          tomorrow: "Active recovery and light cardio."
        },
        equipmentImages: [
          "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500",
          "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=500"
        ]
      });
    }

    res.json(gym);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
