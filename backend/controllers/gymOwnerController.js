import Gym from '../models/Gym.js';
import Attendance from '../models/Attendance.js';
import GymPlan from '../models/GymPlan.js';
import User from '../models/User.js';
import TourRequest from '../models/TourRequest.js';
import Payment from '../models/Payment.js';
import PaymentConfig from '../models/PaymentConfig.js';
import Notification from '../models/Notification.js';

// @desc    Get Gym Owner Dashboard data
// @route   GET /api/gym-owner/dashboard/:ownerName
// @access  Private / GymOwner, Admin
export const getGymOwnerDashboard = async (req, res) => {
  const { ownerName } = req.params;

  try {
    const isOwnerRole = req.user && (req.user.role === 'GymOwner' || req.user.role === 'gym_owner');
    const isAdmin = req.user && ['Admin', 'SuperAdmin'].includes(req.user.role);

    if (isOwnerRole && ownerName && ownerName !== req.user.name && !isAdmin) {
      return res.status(403).json({ message: 'Access denied: You cannot view another gym owner\'s dashboard' });
    }

    let gym = null;
    let todayAttendance = [];
    let activeMembersCount = 0;

    try {
      if (isOwnerRole) {
        if (req.user._id) {
          gym = await Gym.findOne({ $or: [{ owner: req.user._id }, { ownerName: req.user.name }] });
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

    const monthlyRevenue = gym ? (activeMembersCount * (gym.monthlyFee || 0)) : 0;

    res.json({
      gym,
      stats: {
        activeMembersCount,
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
    const { 
      name, location, monthlyFee, admissionFee, bankDetails, description, 
      facilities, equipmentImages, equipmentList, timings, todayTrainingTip, dailyTip, 
      trainerIncluded,
      securityDeposit, securityDepositRefundable, yearlyDiscountPercent, trainerPolicy
    } = req.body;
    const tipPayload = todayTrainingTip || dailyTip;

    // Validate fees and policies
    if (typeof monthlyFee !== 'undefined') {
      const num = Number(monthlyFee);
      if (!Number.isFinite(num) || num < 0) {
        return res.status(400).json({ message: 'Monthly fee must be a valid non-negative number.' });
      }
    }
    if (typeof admissionFee !== 'undefined') {
      const num = Number(admissionFee);
      if (!Number.isFinite(num) || num < 0) {
        return res.status(400).json({ message: 'Admission fee must be a valid non-negative number.' });
      }
    }
    if (typeof securityDeposit !== 'undefined') {
      const num = Number(securityDeposit);
      if (!Number.isFinite(num) || num < 0) {
        return res.status(400).json({ message: 'Security deposit must be a valid non-negative number.' });
      }
    }
    if (typeof yearlyDiscountPercent !== 'undefined') {
      const num = Number(yearlyDiscountPercent);
      if (!Number.isFinite(num) || num < 0 || num > 50) {
        return res.status(400).json({ message: 'Yearly discount percent must be a number between 0 and 50.' });
      }
    }
    if (typeof trainerPolicy !== 'undefined') {
      if (typeof trainerPolicy !== 'object' || trainerPolicy === null) {
        return res.status(400).json({ message: 'Trainer policy must be an object.' });
      }
      if (typeof trainerPolicy.personalTrainerMonthlyFee !== 'undefined') {
        const num = Number(trainerPolicy.personalTrainerMonthlyFee);
        if (!Number.isFinite(num) || num < 0) {
          return res.status(400).json({ message: 'Personal trainer monthly fee must be a valid non-negative number.' });
        }
      }
      if (typeof trainerPolicy.notes !== 'undefined' && typeof trainerPolicy.notes === 'string' && trainerPolicy.notes.length > 300) {
        return res.status(400).json({ message: 'Trainer policy notes must be 300 characters or fewer.' });
      }
    }

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

        // Lock facility identity & location if under verification or approved
        const isLockedStatus = ['Approved', 'Pending Review', 'Under Review', 'More Information Required'].includes(gym.approvalStatus);
        if (!isLockedStatus) {
          if (name) gym.name = name;
          if (location) {
            gym.location = location;
            gym.address = location;
          }
        }

        if (typeof monthlyFee !== 'undefined') gym.monthlyFee = Number(monthlyFee);
        if (typeof admissionFee !== 'undefined') gym.admissionFee = Number(admissionFee);
        if (typeof securityDeposit !== 'undefined') gym.securityDeposit = Number(securityDeposit);
        if (typeof securityDepositRefundable !== 'undefined') gym.securityDepositRefundable = Boolean(securityDepositRefundable);
        if (typeof yearlyDiscountPercent !== 'undefined') gym.yearlyDiscountPercent = Number(yearlyDiscountPercent);
        
        if (typeof trainerPolicy !== 'undefined') {
          gym.trainerPolicy = {
            guidanceTrainer: Boolean(trainerPolicy.guidanceTrainer),
            personalTrainer: Boolean(trainerPolicy.personalTrainer),
            personalTrainerMonthlyFee: Number(trainerPolicy.personalTrainerMonthlyFee) || 0,
            notes: typeof trainerPolicy.notes === 'string' ? trainerPolicy.notes.slice(0, 300) : ''
          };
          gym.trainerIncluded = Boolean(gym.trainerPolicy.guidanceTrainer || gym.trainerPolicy.personalTrainer);
        } else if (trainerIncluded !== undefined) {
          gym.trainerIncluded = Boolean(trainerIncluded);
        }

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

      const effectiveTrainerPolicy = trainerPolicy ? {
        guidanceTrainer: Boolean(trainerPolicy.guidanceTrainer),
        personalTrainer: Boolean(trainerPolicy.personalTrainer),
        personalTrainerMonthlyFee: Number(trainerPolicy.personalTrainerMonthlyFee) || 0,
        notes: typeof trainerPolicy.notes === 'string' ? trainerPolicy.notes.slice(0, 300) : ''
      } : {
        guidanceTrainer: false,
        personalTrainer: false,
        personalTrainerMonthlyFee: 0,
        notes: ''
      };

      const newGym = await Gym.create({
        owner: req.user?._id || null,
        ownerName,
        ownerEmail,
        name: name || `${ownerName}'s Gym`,
        location: location || 'Unknown',
        monthlyFee: Number(monthlyFee) || 0,
        admissionFee: Number(admissionFee) || 0,
        securityDeposit: typeof securityDeposit !== 'undefined' ? Number(securityDeposit) : 0,
        securityDepositRefundable: typeof securityDepositRefundable !== 'undefined' ? Boolean(securityDepositRefundable) : true,
        yearlyDiscountPercent: typeof yearlyDiscountPercent !== 'undefined' ? Number(yearlyDiscountPercent) : 0,
        trainerPolicy: effectiveTrainerPolicy,
        trainerIncluded: trainerPolicy
          ? Boolean(effectiveTrainerPolicy.guidanceTrainer || effectiveTrainerPolicy.personalTrainer)
          : (typeof trainerIncluded !== 'undefined' ? Boolean(trainerIncluded) : false),
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
    console.error('updateGymProfile error:', error);
    res.status(500).json({ message: 'Failed to update gym profile' });
  }
};

// @desc    Update Gym Equipment Status
// @route   PUT /api/gym-owner/equipment
// @access  Private / GymOwner
export const updateEquipmentStatus = async (req, res) => {
  try {
    const { equipmentStatus, gymId } = req.body;
    let gym = null;
    if (gymId) {
      gym = await Gym.findById(gymId);
    }
    if (!gym) {
      gym = await Gym.findOne({ $or: [{ owner: req.user._id }, { ownerName: req.user.name }] });
    }
    if (!gym) {
      return res.status(404).json({ message: 'Gym facility not found' });
    }

    if (!isAuthorizedGymOwner(gym, req.user)) {
      return res.status(403).json({ message: 'Not authorized to modify this gym equipment' });
    }

    const validCategories = ['Cardio', 'Strength Machine', 'Free Weights', 'Functional', 'Other'];
    const cleaned = Array.isArray(equipmentStatus)
      ? equipmentStatus
          .filter(e => e && typeof e.name === 'string' && e.name.trim().length > 0)
          .map(e => ({
            name: e.name.trim(),
            category: validCategories.includes(e.category) ? e.category : 'Other',
            status: ['Available', 'Maintenance', 'Unavailable'].includes(e.status) ? e.status : 'Available',
            quantity: Math.max(1, parseInt(e.quantity, 10) || 1),
            notes: e.notes ? String(e.notes).trim() : ''
          }))
      : [];

    gym.equipmentStatus = cleaned;
    // Synchronize available equipment list for public display on Explore and Gym page
    gym.equipmentList = cleaned
      .filter(e => e.status !== 'Unavailable')
      .map(e => e.name);

    await gym.save();
    res.json({
      message: 'Equipment status updated successfully',
      equipmentStatus: gym.equipmentStatus,
      equipmentList: gym.equipmentList
    });
  } catch (error) {
    console.error('updateEquipmentStatus error:', error);
    res.status(500).json({ message: 'Failed to update equipment status' });
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
    console.error('checkInMember error:', error);
    res.status(500).json({ message: 'Failed to check in member' });
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
    console.error('checkOutMember error:', error);
    res.status(500).json({ message: 'Failed to check out member' });
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
      console.error('saveMemberPlan error:', error);
      return res.status(500).json({ message: 'Unable to save the member plan' });
    }
  } catch (error) {
    console.error('createGymPlan error:', error);
    res.status(500).json({ message: 'Failed to create gym plan' });
  }
};

export const createMemberPlan = createGymPlan;

// @desc    Get Gym Plans (Workouts & Diets)
// @route   GET /api/gym-owner/plans
// @access  Private / GymOwner, GymTrainer, Admin
export const getGymPlans = async (req, res) => {
  try {
    const { gymId, memberName, planType } = req.query;
    let query = {};
    if (gymId) query.gymId = gymId;
    if (memberName) query.memberName = memberName;
    if (planType) query.planType = planType;

    if (req.user?.role === 'GymTrainer') {
      const trainerGym = req.user.assignedGymName || req.user.subscribedGymName;
      query.$or = [
        { assignedBy: req.user.name },
        ...(trainerGym ? [{ gymId: trainerGym }] : [])
      ];
    }

    const plans = await GymPlan.find(query).sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    console.error('getGymPlans error:', error);
    res.status(500).json({ message: 'Failed to fetch gym plans' });
  }
};

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

    const gym = await Gym.findOne({ name: gymName });
    if (!gym) {
      return res.status(404).json({ message: 'Gym facility not found' });
    }

    const isAdmin = ['SuperAdmin', 'Admin'].includes(req.user.role);
    const isOwner = (gym.owner && String(gym.owner) === String(req.user._id)) || (gym.ownerName === req.user.name);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'You are not authorized to provision trainers for this gym' });
    }

    if (!isAdmin && gym.approvalStatus !== 'Approved') {
      return res.status(403).json({ message: 'Trainers can only be provisioned for verified and approved gym facilities' });
    }

    const trainer = await User.create({
      name,
      email,
      password,
      role: 'GymTrainer',
      assignedGymName: gym.name,
      assignedBranch: gym._id,
      organization: gym.organization,
      invitedBy: req.user._id,
      isEmailVerified: true
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

// @desc    Get all tour requests for a gym facility
// @route   GET /api/gym-owner/tour-requests/:gymId
// @access  Private / GymOwner
export const getGymTourRequests = async (req, res) => {
  try {
    const { gymId } = req.params;
    const tours = await TourRequest.find({ gym: gymId }).sort({ tourDate: 1, createdAt: -1 });
    return res.json(tours || []);
  } catch (error) {
    console.error('getGymTourRequests error:', error.message);
    res.status(500).json({ message: 'Failed to fetch tour requests' });
  }
};

// @desc    Update status of a tour request (Confirm/Decline)
// @route   PUT /api/gym-owner/tour-requests/:id/status
// @access  Private / GymOwner
export const updateTourRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, ownerResponse } = req.body;

    const validStatuses = ['Pending', 'Confirmed', 'Declined', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const tour = await TourRequest.findById(id);
    if (!tour) {
      return res.status(404).json({ message: 'Tour request not found' });
    }

    tour.status = status;
    if (ownerResponse) tour.ownerResponse = ownerResponse;
    await tour.save();

    return res.json({ success: true, tour });
  } catch (error) {
    console.error('updateTourRequestStatus error:', error.message);
    res.status(500).json({ message: 'Failed to update tour request status' });
  }
};

// @desc    Gym Owner pays annual partner listing fee to activate verified gym
// @route   POST /api/gym-owner/gym/:id/pay-annual-fee
// @access  Private / GymOwner, Admin
export const payAnnualGymFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'Card', transactionRef = '' } = req.body;

    const gym = await Gym.findById(id);
    if (!gym) {
      return res.status(404).json({ message: 'Gym facility not found' });
    }

    const isOwner = (gym.owner && String(gym.owner) === String(req.user._id)) ||
                    gym.ownerName === req.user.name ||
                    (req.user.role && ['Admin', 'SuperAdmin'].includes(req.user.role));

    if (!isOwner) {
      return res.status(403).json({ message: 'Access denied: You do not own this facility' });
    }

    if (gym.approvalStatus !== 'Approved') {
      return res.status(400).json({ 
        message: 'Gym verification must be approved by administration before paying the annual partner fee.' 
      });
    }

    // Determine platform fee from PaymentConfig
    let feeAmount = 20;
    try {
      const feeConfig = await PaymentConfig.findOne({ method: 'PlatformFee' });
      if (feeConfig && Number.isFinite(feeConfig.amount) && feeConfig.amount > 0) {
        feeAmount = feeConfig.amount;
      }
    } catch (e) {
      console.warn('Could not read PlatformFee config, using default 20:', e.message);
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    gym.annualSubscriptionFee = feeAmount;
    gym.subscriptionPaid = true;
    gym.subscriptionPaidAt = now;
    gym.subscriptionExpiresAt = expiresAt;
    gym.subscriptionPaymentMethod = paymentMethod;
    gym.isOnline = true;
    gym.listingStatus = 'Online';

    await gym.save();

    // Create Payment record
    const paymentId = `FEE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveMethod = ['Stripe', 'Easypaisa', 'JazzCash', 'Card'].includes(paymentMethod) 
      ? paymentMethod 
      : 'Card';

    await Payment.create({
      paymentId,
      userId: req.user._id,
      userName: req.user.name,
      gymName: gym.name,
      paymentType: 'AnnualGymListingFee',
      paymentMethod: effectiveMethod,
      amount: feeAmount,
      commission15Percent: 0,
      status: 'Completed',
      transactionRef: transactionRef || `REF-${paymentId}`,
      methodDetails: `Annual Partner Listing Fee ($${feeAmount}/year)`,
      approvedBy: 'GymSync Automated Billing'
    });

    // Notify owner
    try {
      await Notification.create({
        userId: String(req.user._id),
        recipientId: req.user._id,
        senderId: req.user._id,
        sender: 'GymSync Billing',
        type: 'system',
        title: 'Gym Facility is Now Online! 🟢',
        message: `Your annual partner fee of $${feeAmount} for "${gym.name}" has been confirmed. Your facility is now LIVE and visible to trainees on Explore Gyms!`,
        link: `/gym/${gym._id}`,
        relatedId: String(gym._id),
        isRead: false
      });
    } catch (nErr) {
      console.warn('Failed to send notification for annual fee payment:', nErr.message);
    }

    return res.json({
      success: true,
      message: `Annual partner listing fee of $${feeAmount} confirmed! "${gym.name}" is now online and publicly visible.`,
      gym: {
        _id: gym._id,
        name: gym.name,
        branchName: gym.branchName || gym.name,
        approvalStatus: gym.approvalStatus,
        annualSubscriptionFee: gym.annualSubscriptionFee,
        subscriptionPaid: gym.subscriptionPaid,
        subscriptionPaidAt: gym.subscriptionPaidAt,
        subscriptionExpiresAt: gym.subscriptionExpiresAt,
        isOnline: gym.isOnline,
        listingStatus: gym.listingStatus
      }
    });
  } catch (error) {
    console.error('payAnnualGymFee error:', error);
    return res.status(500).json({ message: 'Failed to process annual partner fee' });
  }
};
