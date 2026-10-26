import Gym from '../models/Gym.js';
import User from '../models/User.js';
import GymPlan from '../models/GymPlan.js';
import Attendance from '../models/Attendance.js';
import Post from '../models/Post.js';
import TourRequest from '../models/TourRequest.js';
import Coupon from '../models/Coupon.js';

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

    if (gym.approvalStatus !== 'Approved' || (!gym.isOnline && !gym.subscriptionPaid)) {
      const isOwner = req.user && ((gym.owner && String(gym.owner) === String(req.user._id)) || gym.ownerName === req.user.name);
      const isAdmin = req.user && ['Admin', 'SuperAdmin'].includes(req.user.role);
      if (!isOwner && !isAdmin) {
        return res.status(404).json({ message: 'Gym not found or not currently publicly listed' });
      }
    }

    // Query official trainers assigned to this gym - only expose safe public fields
    let trainers = [];
    try {
      const rawTrainers = await User.find(
        {
          role: 'GymTrainer',
          $or: [
            { assignedGymName: gym.name },
            { gymName: gym.name },
            { assignedBranch: gym._id }
          ]
        },
        { name: 1, profilePic: 1, bio: 1, fitnessGoal: 1, bioData: 1 }
      ).lean();

      trainers = rawTrainers.map(t => ({
        _id: t._id,
        name: t.name,
        profilePic: t.profilePic || '',
        bio: t.bio || '',
        fitnessGoal: t.fitnessGoal || '',
        specialization: t.bioData?.mainGoalArea || t.fitnessGoal || 'Fitness Coach',
        fitnessLevel: t.bioData?.fitnessLevel || 'Certified'
      }));
    } catch (trainersErr) {
      console.error('Error fetching trainers for gym:', trainersErr);
    }

    // Query active non-expired public coupons belonging to this gym or owner
    let activeOffers = [];
    try {
      let gymIds = [gym._id];
      if (gym.owner) {
        const ownerGyms = await Gym.find({ owner: gym.owner }).select('_id');
        gymIds = Array.from(new Set([...gymIds, ...ownerGyms.map(g => g._id)]));
      }

      const now = new Date();
      const coupons = await Coupon.find({
        gymId: { $in: gymIds },
        isActive: true,
        approvalStatus: 'Approved',
        validUntil: { $gte: now },
        audience: { $ne: 'SingleUser' }
      }).sort({ discountValue: -1 }).lean();

      activeOffers = coupons
        .filter(c => !c.usageLimit || c.timesUsed < c.usageLimit)
        .map(c => ({
          code: c.code,
          discountType: c.discountType,
          discountValue: c.discountValue,
          title: c.discountType === 'Percentage' ? `${c.discountValue}% OFF` : `Rs. ${c.discountValue} OFF`,
          description: c.audience === 'NewMembersOnly' ? 'Exclusive discount for new members' : 'Limited-time special offer',
          audience: c.audience,
          validUntil: c.validUntil
        }));
    } catch (offerErr) {
      console.error('getGymById activeOffers error:', offerErr);
    }

    let activeMembersCount = 0;
    try {
      const distinctMembers = await GymPlan.distinct('memberName', { gymId: gym._id.toString() });
      activeMembersCount = distinctMembers.length;
    } catch {}

    // Safe default logic for old gyms
    const hasExplicitTrainerPolicy = Boolean(
      gym.trainerPolicy?.guidanceTrainer ||
      gym.trainerPolicy?.personalTrainer ||
      gym.trainerPolicy?.personalTrainerMonthlyFee ||
      (gym.trainerPolicy?.notes && gym.trainerPolicy.notes.trim().length > 0)
    );
    const trainerPolicy = {
      guidanceTrainer: Boolean(
        gym.trainerPolicy?.guidanceTrainer || (!hasExplicitTrainerPolicy && gym.trainerIncluded)
      ),
      personalTrainer: Boolean(gym.trainerPolicy?.personalTrainer ?? false),
      personalTrainerMonthlyFee: Number(gym.trainerPolicy?.personalTrainerMonthlyFee) || 0,
      notes: gym.trainerPolicy?.notes || ''
    };

    const equipmentStatus = (gym.equipmentStatus || []).map(e => ({
      name: e.name,
      category: e.category || 'Other',
      status: e.status || 'Available',
      quantity: Number(e.quantity) || 1,
      notes: e.notes || ''
    }));

    return res.json({
      _id: gym._id,
      id: gym._id,
      name: gym.name,
      branchName: gym.branchName || gym.name,
      location: gym.location,
      address: gym.address || gym.location,
      city: gym.city || '',
      country: gym.country || 'Pakistan',
      coordinates: gym.coordinates || null,
      googleMapsUrl: gym.googleMapsUrl || '',
      approvalStatus: gym.approvalStatus || 'Draft',
      monthlyFee: Number(gym.monthlyFee) || 0,
      admissionFee: Number(gym.admissionFee) || 0,
      securityDeposit: Number.isFinite(gym.securityDeposit) ? gym.securityDeposit : 0,
      securityDepositRefundable: gym.securityDepositRefundable ?? true,
      yearlyDiscountPercent: Number.isFinite(gym.yearlyDiscountPercent) ? gym.yearlyDiscountPercent : 0,
      trainerPolicy,
      trainerIncluded: Boolean(gym.trainerIncluded || trainerPolicy.guidanceTrainer || trainerPolicy.personalTrainer),
      bankDetails: gym.bankDetails,
      description: gym.description || '',
      facilities: gym.facilities || [],
      equipmentImages: gym.equipmentImages || [],
      equipmentStatus,
      equipmentList: gym.equipmentList || [],
      trainers: trainers || [],
      activeOffers: activeOffers || [],
      activeMembersCount: activeMembersCount || 0,
      photos: gym.photos || [],
      rating: gym.rating || 0,
      reviews: gym.reviews || [],
      timings: gym.timings || null,
      todayTrainingTip: typeof gym.todayTrainingTip === 'string' ? gym.todayTrainingTip : (gym.todayTrainingTip?.today || ''),
      ownerName: gym.ownerName,
      ownerEmail: gym.ownerEmail,
      annualSubscriptionFee: gym.annualSubscriptionFee || 20,
      subscriptionPaid: gym.subscriptionPaid || false,
      subscriptionPaidAt: gym.subscriptionPaidAt || null,
      subscriptionExpiresAt: gym.subscriptionExpiresAt || null,
      isOnline: gym.isOnline || false,
      listingStatus: gym.listingStatus || (gym.approvalStatus === 'Approved' ? (gym.subscriptionPaid ? 'Online' : 'Pending Payment') : 'Offline')
    });
  } catch (error) {
    console.error('getGymById error:', error);
    res.status(500).json({ message: 'Failed to fetch gym details' });
  }
};

// @desc    List public gyms (approved and online)
// @route   GET /api/gyms
// @access  Public
export const getGymsList = async (req, res) => {
  try {
    const gyms = await Gym.find({
      approvalStatus: 'Approved',
      $or: [
        { isOnline: true },
        { subscriptionPaid: true }
      ]
    }).sort({ createdAt: -1 });

    const now = new Date();
    const couponsByGym = new Map();
    try {
      const activeCoupons = await Coupon.find({
        isActive: true,
        approvalStatus: 'Approved',
        validUntil: { $gte: now },
        audience: { $ne: 'SingleUser' }
      }).lean();

      activeCoupons.forEach(c => {
        if (c.usageLimit > 0 && c.timesUsed >= c.usageLimit) return;
        const gId = String(c.gymId);
        if (!couponsByGym.has(gId)) couponsByGym.set(gId, []);
        couponsByGym.get(gId).push({
          code: c.code,
          discountType: c.discountType,
          discountValue: c.discountValue,
          title: c.discountType === 'Percentage' ? `${c.discountValue}% OFF` : `Rs. ${c.discountValue} OFF`,
          description: c.audience === 'NewMembersOnly' ? 'Exclusive discount for new members' : 'Limited-time special offer',
          audience: c.audience,
          validUntil: c.validUntil
        });
      });
    } catch (couponErr) {
      console.error('getGymsList coupons fetch error:', couponErr);
    }

    // Map to response for Explore page
    const payload = gyms.map(g => {
      const hasExplicitTrainerPolicy = Boolean(
        g.trainerPolicy?.guidanceTrainer ||
        g.trainerPolicy?.personalTrainer ||
        g.trainerPolicy?.personalTrainerMonthlyFee ||
        (g.trainerPolicy?.notes && g.trainerPolicy.notes.trim().length > 0)
      );
      const trainerPolicy = {
        guidanceTrainer: Boolean(
          g.trainerPolicy?.guidanceTrainer || (!hasExplicitTrainerPolicy && g.trainerIncluded)
        ),
        personalTrainer: Boolean(g.trainerPolicy?.personalTrainer ?? false),
        personalTrainerMonthlyFee: Number(g.trainerPolicy?.personalTrainerMonthlyFee) || 0,
        notes: g.trainerPolicy?.notes || ''
      };

      const equipmentStatus = (g.equipmentStatus || []).map(e => ({
        name: e.name,
        category: e.category || 'Other',
        status: e.status || 'Available',
        quantity: Number(e.quantity) || 1,
        notes: e.notes || ''
      }));

      const activeOffers = couponsByGym.get(String(g._id)) || [];

      return {
        _id: g._id,
        id: g._id,
        name: g.name,
        branchName: g.branchName || g.name,
        location: g.location,
        address: g.address || g.location,
        city: g.city || '',
        country: g.country || 'Pakistan',
        coordinates: g.coordinates || null,
        googleMapsUrl: g.googleMapsUrl || '',
        approvalStatus: g.approvalStatus || 'Approved',
        monthlyFee: Number(g.monthlyFee) || 0,
        admissionFee: Number(g.admissionFee) || 0,
        securityDeposit: Number.isFinite(g.securityDeposit) ? g.securityDeposit : 0,
        securityDepositRefundable: g.securityDepositRefundable ?? true,
        yearlyDiscountPercent: Number.isFinite(g.yearlyDiscountPercent) ? g.yearlyDiscountPercent : 0,
        trainerPolicy,
        trainerIncluded: Boolean(g.trainerIncluded || trainerPolicy.guidanceTrainer || trainerPolicy.personalTrainer),
        annualSubscriptionFee: g.annualSubscriptionFee || 20,
        subscriptionPaid: g.subscriptionPaid || false,
        isOnline: g.isOnline || false,
        listingStatus: g.listingStatus || 'Online',
        description: g.description || '',
        facilities: g.facilities || [],
        equipmentImages: g.equipmentImages || [],
        equipmentStatus,
        equipmentList: g.equipmentList || [],
        activeOffers,
        rating: g.rating || 0,
        reviews: g.reviews || [],
        timings: g.timings || null,
        image: (g.equipmentImages && g.equipmentImages.length > 0) ? g.equipmentImages[0] : null,
        todayTrainingTip: typeof g.todayTrainingTip === 'string' ? g.todayTrainingTip : (g.todayTrainingTip?.today || ''),
        ownerName: g.ownerName
      };
    });

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
