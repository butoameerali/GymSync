import Gym from '../models/Gym.js';
import User from '../models/User.js';
import GymPlan from '../models/GymPlan.js';
import Attendance from '../models/Attendance.js';
import Post from '../models/Post.js';
import TourRequest from '../models/TourRequest.js';

// @desc    Get gym details for a specific user's gym (owner or member)
// @route   GET /api/gyms/my-gym/:userId
// @access  Private
export const getMyGym = async (req, res) => {
  try {
    const { userId } = req.params;
    const caller = req.user;

    if (!caller) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const isSelf = userId && (String(caller._id) === String(userId) || caller.name === userId);
    const isAdmin = ['Admin', 'SuperAdmin'].includes(caller.role);

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view gym facility details for this user' });
    }

    // Try to find by owner ObjectId, ownerEmail (if provided), or header fallback name
    let gym = null;

    if (userId) {
      gym = await Gym.findOne({ owner: userId });
    }

    if (!gym && req.user) {
      // match by ownerName or ownerEmail if token/header provided
      const ownerName = req.user.name;
      const ownerEmail = req.user.email;
      gym = await Gym.findOne({ $or: [ { ownerName }, { ownerEmail } ] });
    }

    if (!gym) {
      // If no gym found, return explicit empty result so UI can show creation flow
      return res.status(404).json({ message: 'No gym found for this user' });
    }

    return res.json(gym);
  } catch (error) {
    console.error('getGymDetails error:', error);
    res.status(500).json({ message: 'Failed to fetch gym details' });
  }
};

// @desc    Get gym details by gym id
// @route   GET /api/gyms/:id
// @access  Public
export const getGymById = async (req, res) => {
  try {
    const { id } = req.params;
    const gym = await Gym.findById(id);
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    return res.json({
      _id: gym._id,
      id: gym._id,
      name: gym.name,
      location: gym.location,
      monthlyFee: gym.monthlyFee,
      admissionFee: gym.admissionFee,
      bankDetails: gym.bankDetails,
      description: gym.description,
      facilities: gym.facilities || [],
      equipmentImages: gym.equipmentImages || [],
      rating: gym.rating || 4.8,
      timings: gym.timings || null,
      todayTrainingTip: gym.todayTrainingTip?.today || '',
      ownerName: gym.ownerName,
      ownerEmail: gym.ownerEmail
    });
  } catch (error) {
    console.error('getGymById error:', error);
    res.status(500).json({ message: 'Failed to fetch gym details' });
  }
};

// @desc    List public gyms (approved)
// @route   GET /api/gyms
// @access  Public
export const getGymsList = async (req, res) => {
  try {
    const gyms = await Gym.find({ approvalStatus: 'Approved' }).sort({ createdAt: -1 });
    // Map to lightweight response for Explore page
    const payload = gyms.map(g => ({
      _id: g._id,
      id: g._id,
      name: g.name,
      location: g.location,
      monthlyFee: g.monthlyFee,
      admissionFee: g.admissionFee,
      description: g.description || '',
      facilities: g.facilities || [],
      equipmentImages: g.equipmentImages || [],
      rating: g.rating || 4.8,
      timings: g.timings || null,
      image: (g.equipmentImages && g.equipmentImages.length > 0) ? g.equipmentImages[0] : null,
      todayTrainingTip: g.todayTrainingTip?.today || '',
      ownerName: g.ownerName
    }));

    return res.json(payload);
  } catch (error) {
    console.error('getGymsList error:', error);
    res.status(500).json({ message: 'Failed to list gyms' });
  }
};

// @desc    Get dynamic gym data for User Dashboard (Your Gym page)
// @route   GET /api/gyms/my-gym-data/:userName
// @access  Private
export const getMyGymData = async (req, res) => {
  try {
    const { userName } = req.params;
    const user = req.user?._id
      ? await User.findById(req.user._id)
      : await User.findOne({ name: userName });
    
    if (!user || !user.subscribedGymName) {
      return res.status(404).json({ message: 'No active gym membership was found for this account.' });
    }

    const gym = await Gym.findOne({ name: user.subscribedGymName });
    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    // Fetch plans assigned to this user (matching ObjectId or memberName)
    const plans = await GymPlan.find({
      gymId: gym._id.toString(),
      $or: [{ memberId: user._id.toString() }, { memberName: user.name }]
    });
    
    // Fetch user's attendance log
    const attendanceLogs = await Attendance.find({
      gymId: gym._id.toString(),
      $or: [{ memberId: user._id.toString() }, { memberName: user.name }]
    }).sort({ checkInTime: -1 });

    // Fetch gym owner's posts
    // `author` is an ObjectId; gym.ownerName is a display name. Query the
    // dedicated name field to avoid an ObjectId cast error on Your Gym.
    const posts = await Post.find({ authorName: gym.ownerName }).sort({ createdAt: -1 }).limit(5);

    return res.json({
      gym,
      membership: {
        type: user.gymMembershipType,
        joiningDate: user.gymJoiningDate,
        expiresAt: user.gymMembershipExpiresAt,
        autoRenew: user.gymAutoRenew
      },
      plans,
      attendanceLogs,
      posts
    });
  } catch (error) {
    console.error('getMyGymData error:', error);
    res.status(500).json({ message: 'Failed to fetch gym data' });
  }
};

export const completeGymPlanDay = async (req, res) => {
  try {
    const plan = await GymPlan.findOne({ _id: req.params.planId, memberId: req.user._id.toString() });
    if (!plan) return res.status(404).json({ message: 'Assigned plan not found' });
    const schedule = plan.schedule.id(req.params.scheduleId);
    if (!schedule) return res.status(404).json({ message: 'Scheduled day not found' });
    schedule.completedAt = schedule.completedAt ? null : new Date();
    await plan.save();
    res.json({ completedAt: schedule.completedAt });
  } catch (error) {
    console.error('completeGymPlanDay error:', error);
    res.status(500).json({ message: 'Failed to complete plan day' });
  }
};

// @desc    Create a tour booking request for a facility
// @route   POST /api/gyms/:id/tour-request
// @access  Private
export const createTourRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { tourDate, timeSlot, userPhone, notes } = req.body;

    if (!tourDate || !timeSlot) {
      return res.status(400).json({ error: 'Tour date and time slot are required' });
    }

    const gym = await Gym.findById(id);
    if (!gym) {
      return res.status(404).json({ error: 'Gym facility not found' });
    }

    const tour = new TourRequest({
      gym: gym._id,
      gymName: gym.name,
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userPhone: userPhone || '',
      tourDate: new Date(tourDate),
      timeSlot,
      notes: notes || '',
      status: 'Pending'
    });

    await tour.save();

    res.status(201).json({ success: true, tour });
  } catch (error) {
    console.error('createTourRequest error:', error);
    res.status(500).json({ error: 'Failed to create tour booking request' });
  }
};

// @desc    Get current user's tour requests
// @route   GET /api/gyms/my-tour-requests
// @access  Private
export const getUserTourRequests = async (req, res) => {
  try {
    const tours = await TourRequest.find({ user: req.user._id }).sort({ tourDate: 1, createdAt: -1 });
    res.json(tours || []);
  } catch (error) {
    console.error('getUserTourRequests error:', error);
    res.status(500).json({ error: 'Failed to fetch tour requests' });
  }
};
