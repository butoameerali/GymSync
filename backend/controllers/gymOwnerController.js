import Gym from '../models/Gym.js';
import Attendance from '../models/Attendance.js';
import GymPlan from '../models/GymPlan.js';
import User from '../models/User.js';

// @desc    Get Gym Owner Dashboard data
// @route   GET /api/gym-owner/dashboard/:ownerName
// @access  Private / GymOwner, Admin
export const getGymOwnerDashboard = async (req, res) => {
  try {
    const { ownerName } = req.params;

    // Find gym matching owner or get first gym
    let gym = await Gym.findOne({ ownerName });
    if (!gym) {
      gym = await Gym.findOne();
    }

    if (!gym) {
      gym = {
        _id: 'gym_demo_id',
        name: 'Elite GymSync Fitness Center',
        location: 'Downtown Athletic District',
        monthlyFee: 50,
        ownerName: ownerName,
        rating: 4.8,
        equipmentImages: []
      };
    }

    const gymId = gym._id.toString();

    // Fetch today's attendance logs
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayAttendance = await Attendance.find({
      gymId,
      createdAt: { $gte: startOfDay }
    }).sort({ checkInTime: -1 });

    // Mock enrolled members count (or users assigned to gym)
    const activeMembersCount = 42; 
    const monthlyRevenue = activeMembersCount * (gym.monthlyFee || 50);

    res.json({
      gym,
      activeMembersCount,
      monthlyRevenue,
      todayAttendanceCount: todayAttendance.length,
      todayAttendance
    });
  } catch (error) {
    console.error('Error fetching Gym Owner Dashboard:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Gym profile & facilities
// @route   PUT /api/gym-owner/gym/:id
// @access  Private / GymOwner, Admin
export const updateGymProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, monthlyFee, todayTrainingTip, features } = req.body;

    let gym = await Gym.findById(id);
    if (!gym) {
      // Create if demo gym
      gym = new Gym({
        name,
        location,
        monthlyFee,
        todayTrainingTip: todayTrainingTip || { today: 'Focus on compound lifts.' },
        features: features || []
      });
    } else {
      if (name) gym.name = name;
      if (location) gym.location = location;
      if (monthlyFee) gym.monthlyFee = monthlyFee;
      if (todayTrainingTip) gym.todayTrainingTip = todayTrainingTip;
      if (features) gym.features = features;
    }

    await gym.save();
    res.json({ message: 'Gym details updated successfully', gym });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Log Member Check-In
// @route   POST /api/gym-owner/attendance/check-in
// @access  Private / GymOwner
export const checkInMember = async (req, res) => {
  try {
    const { gymId, memberName, notes } = req.body;

    if (!gymId || !memberName) {
      return res.status(400).json({ message: 'Gym ID and Member Name are required' });
    }

    const attendance = await Attendance.create({
      gymId,
      memberId: memberName.replace(/\s+/g, '_').toLowerCase(),
      memberName,
      checkInTime: new Date(),
      status: 'CheckedIn',
      notes: notes || ''
    });

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Log Member Check-Out
// @route   PUT /api/gym-owner/attendance/check-out/:id
// @access  Private / GymOwner
export const checkOutMember = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    attendance.checkOutTime = new Date();
    attendance.status = 'CheckedOut';
    await attendance.save();

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create custom workout or diet plan for a member
// @route   POST /api/gym-owner/plans
// @access  Private / GymOwner
export const createMemberPlan = async (req, res) => {
  try {
    const { gymId, memberName, assignedBy, planType, title, description, schedule, nutritionMacros } = req.body;

    if (!gymId || !memberName || !planType || !title || !description) {
      return res.status(400).json({ message: 'Required plan fields missing' });
    }

    const plan = await GymPlan.create({
      gymId,
      memberId: memberName.replace(/\s+/g, '_').toLowerCase(),
      memberName,
      assignedBy: assignedBy || 'Gym Owner',
      planType,
      title,
      description,
      schedule: schedule || [],
      nutritionMacros: nutritionMacros || {}
    });

    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
