import Gym from '../models/Gym.js';
import Attendance from '../models/Attendance.js';
import GymPlan from '../models/GymPlan.js';
import User from '../models/User.js';

// @desc    Get Gym Owner Dashboard data
// @route   GET /api/gym-owner/dashboard/:ownerName
// @access  Private / GymOwner, Admin
export const getGymOwnerDashboard = async (req, res) => {
  const { ownerName } = req.params;
  
  const fallbackGym = {
    _id: 'gym_demo_id',
    name: '',
    location: '',
    monthlyFee: 0,
    ownerName: ownerName || 'Gym Owner',
    rating: 0,
    facilities: [],
    equipmentImages: []
  };

  try {
    let gym = null;
    let todayAttendance = [];
    let activeMembersCount = 0; // Default to 0 when no members are added

    try {
      console.log(`getGymOwnerDashboard called for user: ${req.user?._id}, role: ${req.user?.role}`);
      if (req.user && (req.user.role === 'GymOwner' || req.user.role === 'gym_owner')) {
        if (req.user._id) {
          gym = await Gym.findOne({ owner: req.user._id });
          console.log(`Gym found by owner ID:`, gym ? gym._id : 'null');
        }
      } else {
        gym = await Gym.findOne({ ownerName });
      }
      
      if (gym) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        todayAttendance = await Attendance.find({
          gymId: gym._id.toString(),
          createdAt: { $gte: startOfDay }
        }).sort({ checkInTime: -1 });

        const distinctMembers = await GymPlan.distinct('memberName', { gymId: gym._id.toString() });
        activeMembersCount = distinctMembers.length;
      }
    } catch (e) {}

    if (!gym) gym = fallbackGym;

    const monthlyRevenue = activeMembersCount * (gym.monthlyFee || 50);

    res.json({
      gym,
      stats: {
        activeMembersCount, // Fix: 0 by default when no members are added
        todayCheckIns: todayAttendance.length,
        monthlyRevenue,
        commission15PercentOwed: monthlyRevenue * 0.15,
        saasSubscriptionStatus: 'Active', // 50% discount feature status
        warningDaysRemaining: 10
      },
      todayAttendance
    });
  } catch (error) {
    res.json({
      gym: fallbackGym,
      stats: { activeMembersCount: 0, todayCheckIns: 0, monthlyRevenue: 0, commission15PercentOwed: 0 },
      todayAttendance: []
    });
  }
};

const isAuthorizedGymOwner = (gym, user) => {
  if (!gym || !user) return false;
  const isAdmin = ['Admin', 'SuperAdmin'].includes(user.role);
  if (isAdmin) return true;

  const isOwnerIdMatch = gym.owner && String(gym.owner) === String(user._id);
  const isOwnerNameMatch = gym.ownerName && gym.ownerName === user.name;

  return Boolean(isOwnerIdMatch || isOwnerNameMatch);
};

// @desc    Update Gym Profile Facility Information
// @route   PUT /api/gym-owner/gym/:id
// @access  Private / GymOwner
export const updateGymProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, monthlyFee, admissionFee, bankDetails, description, facilities, equipmentImages, equipmentList, timings, todayTrainingTip, dailyTip } = req.body;
    const tipPayload = todayTrainingTip || dailyTip;

    try {
      let gym = null;
      if (id && id !== 'gym_demo_id') {
        try {
          gym = await Gym.findById(id);
          if (gym && !isAuthorizedGymOwner(gym, req.user)) {
            return res.status(403).json({ message: 'Not authorized to modify this gym facility' });
          }
        } catch(err) { gym = null; }
      }

      if (!gym) {
        if (req.user) {
          const ownerName = req.user?.name || 'Gym Owner';
          gym = await Gym.findOne({ $or: [{ ownerName }, { owner: req.user._id }] });
        }
      }

      if (gym) {
        if (!isAuthorizedGymOwner(gym, req.user)) {
          return res.status(403).json({ message: 'Not authorized to modify this gym facility' });
        }
        if (name) gym.name = name;
        if (location) gym.location = location;
        if (typeof monthlyFee !== 'undefined') gym.monthlyFee = Number(monthlyFee);
        if (typeof admissionFee !== 'undefined') gym.admissionFee = Number(admissionFee);
        if (typeof bankDetails !== 'undefined') gym.bankDetails = bankDetails;
        if (description) gym.description = description;
        if (Array.isArray(facilities)) gym.facilities = facilities;
        if (Array.isArray(equipmentImages)) gym.equipmentImages = equipmentImages;
        if (Array.isArray(equipmentList)) gym.equipmentList = equipmentList;
        if (timings) gym.timings = timings;
        if (typeof tipPayload !== 'undefined') gym.todayTrainingTip = tipPayload;
        await gym.save();
        return res.json(gym);
      }

      // If still no gym found, create one for the owner
      const ownerName = req.user?.name || 'Gym Owner';
      const ownerEmail = req.user?.email || '';
      const newGym = await Gym.create({
        owner: req.user?._id || null,
        ownerName,
        ownerEmail,
        name: name || `${ownerName}'s Gym`,
        location: location || 'Unknown',
        monthlyFee: Number(monthlyFee) || 0,
        admissionFee: Number(admissionFee) || 0,
        bankDetails: bankDetails || '',
        description: description || '',
        facilities: Array.isArray(facilities) ? facilities : [],
        equipmentImages: Array.isArray(equipmentImages) ? equipmentImages : [],
        approvalStatus: 'Pending',
        todayTrainingTip: tipPayload || { today: '' }
      });

      return res.status(201).json(newGym);
    } catch (e) {
      console.error('updateGymProfile error:', e.message);
    }

    res.json(gym || { _id: id, name, location, monthlyFee: Number(monthlyFee), facilities, equipmentImages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Gym Profile Facility Information
// @route   DELETE /api/gym-owner/gym/:id
// @access  Private / GymOwner
export const deleteGymProfile = async (req, res) => {
  try {
    const { id } = req.params;
    let gym = null;

    if (id && id !== 'gym_demo_id') {
      gym = await Gym.findById(id);
    }

    if (!gym) {
      if (req.user && req.user._id) {
        gym = await Gym.findOne({ owner: req.user._id });
      }
      if (!gym && req.user && req.user.role !== 'GymOwner' && req.user.role !== 'gym_owner') {
        const ownerName = req.user?.name || 'Gym Owner';
        gym = await Gym.findOne({ ownerName });
      }
    }

    if (!gym) {
      return res.status(404).json({ message: 'Gym not found or already deleted' });
    }

    if (!isAuthorizedGymOwner(gym, req.user)) {
      return res.status(403).json({ message: 'Not authorized to delete this gym facility' });
    }

    await Gym.findByIdAndDelete(gym._id);
    return res.json({ message: 'Gym successfully deleted' });
  } catch (error) {
    console.error('deleteGymProfile error:', error.message);
    res.status(500).json({ message: 'Failed to delete gym profile' });
  }
};

// @desc    Express Member Check-In
// @route   POST /api/gym-owner/attendance/check-in
// @access  Private / GymOwner
export const checkInMember = async (req, res) => {
  try {
    const { gymId, memberId, memberName, notes } = req.body;

    if (!memberName && !memberId) {
      return res.status(400).json({ message: 'Member name or ID is required for check-in' });
    }

    let member = null;
    if (memberId && /^[a-f\d]{24}$/i.test(memberId)) {
      member = await User.findById(memberId);
    }
    if (!member && memberName) {
      member = await User.findOne({ name: memberName });
    }

    const resolvedMemberId = member ? String(member._id) : (memberId || `mem_${Date.now()}`);
    const resolvedMemberName = member ? member.name : memberName;

    // Check if member already has an active checked-in session today
    const existingActive = await Attendance.findOne({
      memberName: resolvedMemberName,
      status: 'CheckedIn'
    });

    if (existingActive) {
      return res.status(400).json({ message: `${resolvedMemberName} is already checked in` });
    }

    const attendance = await Attendance.create({
      gymId: gymId || 'gym_demo_id',
      memberId: resolvedMemberId,
      memberName: resolvedMemberName,
      checkInTime: new Date(),
      status: 'CheckedIn',
      notes: notes || ''
    });

    return res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Member Check-Out
// @route   POST /api/gym-owner/attendance/check-out/:id
// @access  Private / GymOwner
export const checkOutMember = async (req, res) => {
  try {
    const { id } = req.params;

    try {
      const attendance = await Attendance.findById(id);
      if (attendance) {
        attendance.checkOutTime = new Date();
        attendance.status = 'CheckedOut';
        await attendance.save();
        return res.json(attendance);
      }
    } catch (e) {}

    res.json({ _id: id, status: 'CheckedOut', checkOutTime: new Date() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Custom Member Plan (Workout or Diet)
// @route   POST /api/gym-owner/plans
// @access  Private / GymOwner
export const uploadGymPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'No photo was uploaded' });
    }

    const imageUrl = req.file.buffer
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      : `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    let gym = null;

    if (id && id !== 'gym_demo_id') {
      try {
        gym = await Gym.findById(id);
      } catch(err) { gym = null; }
    }
    if (!gym) {
      if (req.user && req.user._id) {
        gym = await Gym.findOne({ owner: req.user._id });
      }
      if (!gym && req.user && req.user.role !== 'GymOwner' && req.user.role !== 'gym_owner') {
        const ownerName = req.user?.name || 'Gym Owner';
        gym = await Gym.findOne({ ownerName });
      }
    }

    if (!gym) {
      return res.status(404).json({ message: 'Gym not found for photo upload' });
    }

    if (!isAuthorizedGymOwner(gym, req.user)) {
      return res.status(403).json({ message: 'Not authorized to upload photos to this gym' });
    }

    if (!Array.isArray(gym.equipmentImages)) {
      gym.equipmentImages = [];
    }
    gym.equipmentImages.unshift(imageUrl);
    await gym.save();

    return res.json({ message: 'Gym photo uploaded successfully', imageUrl, gym });
  } catch (error) {
    console.error('uploadGymPhoto error:', error.message);
    res.status(500).json({ message: 'Failed to upload gym photo' });
  }
};

export const createGymPlan = async (req, res) => {
  try {
    const { gymId, memberName, planType, title, description, schedule, nutritionMacros } = req.body;

    if (!memberName || !title) {
      return res.status(400).json({ message: 'Member name and plan title are required' });
    }

    try {
      const member = await User.findOne({ name: memberName }).select('_id subscribedGymName');
      if (!member) return res.status(404).json({ message: 'Member not found' });

      // The client may send a gym name; plans are always stored against the
      // gym's database id so they appear on the member's Your Gym page.
      let gym = null;
      if (gymId && /^[a-f\d]{24}$/i.test(gymId)) gym = await Gym.findById(gymId);
      if (!gym) gym = await Gym.findOne({ name: member.subscribedGymName || gymId });
      if (!gym) return res.status(404).json({ message: 'Gym not found for this member' });

      const plan = await GymPlan.create({
        gymId: gym._id.toString(),
        memberId: member._id.toString(),
        memberName,
        assignedBy: req.user?.name || 'Gym Trainer',
        planType: planType || 'Workout',
        title,
        description: description || '',
        schedule: schedule || [],
        nutritionMacros: nutritionMacros || {}
      });
      return res.status(201).json(plan);
    } catch (error) {
      return res.status(500).json({ message: error.message || 'Unable to save the member plan' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMemberPlan = createGymPlan;

// @desc    Create Gym Trainer Account
// @route   POST /api/gym-owner/trainers
// @access  Private / GymOwner
export const createGymTrainer = async (req, res) => {
  try {
    const { name, email, password, gymName } = req.body;
    if (!name || !email || !password || !gymName) {
      return res.status(400).json({ message: 'Name, email, password, and gym name are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const trainer = await User.create({
      name,
      email,
      password,
      role: 'GymTrainer',
      assignedGymName: gymName
    });

    return res.status(201).json({
      _id: trainer._id,
      name: trainer.name,
      email: trainer.email,
      role: trainer.role,
      assignedGymName: trainer.assignedGymName
    });
  } catch (error) {
    console.error('createGymTrainer error:', error.message);
    res.status(500).json({ message: 'Failed to create gym trainer' });
  }
};

// @desc    Get Gym Trainers for a Gym
// @route   GET /api/gym-owner/trainers/:gymName
// @access  Private / GymOwner
export const getGymTrainers = async (req, res) => {
  try {
    const { gymName } = req.params;
    const trainers = await User.find({ role: 'GymTrainer', assignedGymName: gymName }).select('-password');
    return res.json(trainers);
  } catch (error) {
    console.error('getGymTrainers error:', error.message);
    res.status(500).json({ message: 'Failed to fetch gym trainers' });
  }
};
