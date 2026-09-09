import mongoose from 'mongoose';
import User from '../models/User.js';
import Gym from '../models/Gym.js';
import Notification from '../models/Notification.js';
import Post from '../models/Post.js';
import Message from '../models/Message.js';
import WorkoutProgress from '../models/WorkoutProgress.js';
import ExerciseRecord from '../models/ExerciseRecord.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { 
  upsertProfileToSupabase, 
  saveUserExerciseRecord, 
  fetchUserExerciseRecords, 
  upsertWorkoutProgress, 
  fetchWorkoutProgress 
} from '../services/supabaseService.js';
import { uploadToSupabaseStorage } from '../config/supabase.js';
import { isValidObjectId } from '../utils/validation.js';

// @desc    Get all users (for friend search and member directory)
// @route   GET /api/users
// @access  Private
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('_id name profilePic role subscribedGymName friends followers');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get members subscribed to a gym facility
// @route   GET /api/users/gym-members/:gymName
// @access  Private / GymOwner, GymTrainer, Admin, SuperAdmin
export const getGymMembers = async (req, res) => {
  try {
    const { gymName } = req.params;
    const userRole = req.user?.role || 'User';
    const isGlobalAdmin = ['Admin', 'SuperAdmin'].includes(userRole);

    if (!isGlobalAdmin) {
      const isAssignedTrainer = userRole === 'GymTrainer' && (req.user.assignedGymName === gymName || req.user.subscribedGymName === gymName);
      const isOwnerRole = ['GymOwner', 'gym_owner'].includes(userRole);

      if (isOwnerRole) {
        const gym = await Gym.findOne({ name: gymName });
        const ownsGym = gym && (String(gym.owner) === String(req.user._id) || gym.ownerName === req.user.name);
        if (!ownsGym) {
          return res.status(403).json({ message: 'Not authorized to view members for this gym facility' });
        }
      } else if (!isAssignedTrainer) {
        return res.status(403).json({ message: 'Not authorized to view members for this gym facility' });
      }
    }

    const members = await User.find({ subscribedGymName: gymName }).select('_id name email profilePic subscribedGymName gymMembershipType gymJoiningDate gymMembershipExpiresAt');
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a user by name (for public profile)
// @route   GET /api/users/:name
// @access  Public
export const getUserByName = async (req, res) => {
  try {
    const queryParam = req.params.name;
    let user = null;

    if (mongoose.Types.ObjectId.isValid(queryParam)) {
      user = await User.findById(queryParam).select('-password');
    }

    if (!user) {
      user = await User.findOne({ name: queryParam }).select('-password');
    }

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile picture
// @route   PUT /api/users/profile-pic
// @access  Public (Mocked Auth)
export const updateProfilePic = async (req, res) => {
  const { profilePic } = req.body;
  try {
    if (typeof profilePic !== 'string' || profilePic.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'Please provide a valid profile image under 5 MB.' });
    }

    let finalPicUrl = profilePic;
    if (profilePic.startsWith('data:image/')) {
      try {
        const mimeMatch = profilePic.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (mimeMatch) {
          const mimeType = mimeMatch[1];
          const buffer = Buffer.from(mimeMatch[2], 'base64');
          const supaUrl = await uploadToSupabaseStorage({
            buffer,
            mimeType,
            originalName: `${req.user.name || 'avatar'}.png`,
            folder: 'avatars'
          });
          if (supaUrl) {
            finalPicUrl = supaUrl;
          }
        }
      } catch (e) {
        console.warn('[Supabase Avatar Upload Error]:', e.message);
      }
    }

    req.user.profilePic = finalPicUrl;
    await req.user.save();

    // Mirror to Supabase User Profile
    await upsertProfileToSupabase({
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      profilePic: finalPicUrl
    }).catch(() => {});

    res.json({ message: 'Profile picture updated', profilePic: req.user.profilePic });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateGymMembershipSettings = async (req, res) => {
  try {
    req.user.gymAutoRenew = Boolean(req.body.autoRenew);
    await req.user.save();
    res.json({ gymAutoRenew: req.user.gymAutoRenew, gymMembershipExpiresAt: req.user.gymMembershipExpiresAt });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Delete the currently authenticated account and its personal content
// @route   DELETE /api/users/me
// @access  Private
export const deleteCurrentUser = async (req, res) => {
  try {
    const userName = req.user.name;
    await Promise.all([
      Post.deleteMany({ $or: [{ authorName: userName }, { 'author.name': userName }] }),
      Message.deleteMany({ $or: [{ sender: userName }, { receiver: userName }] }),
      Notification.deleteMany({ $or: [{ userId: userName }, { senderName: userName }] }),
      User.updateMany({}, {
        $pull: {
          friends: userName,
          sentRequests: userName,
          receivedRequests: userName,
          followers: userName,
          following: userName
        }
      })
    ]);
    await User.findByIdAndDelete(req.user._id);
    return res.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Helper to find user by name or ObjectId cleanly without creating ghost accounts
const findUserByName = async (nameOrId) => {
  if (!nameOrId) return null;
  if (isValidObjectId(nameOrId)) {
    const userById = await User.findById(nameOrId);
    if (userById) return userById;
  }
  return await User.findOne({ name: nameOrId });
};

// @desc    Send Friend Request
// @route   POST /api/users/request
// @access  Private
export const sendFriendRequest = async (req, res) => {
  const { receiverName } = req.body;
  const senderName = req.user.name;
  try {
    if (!receiverName) return res.status(400).json({ message: 'Target user is required' });
    if (senderName === receiverName) return res.status(400).json({ message: 'Cannot send friend request to yourself' });

    const sender = await User.findById(req.user._id);
    const receiver = await findUserByName(receiverName);

    if (!sender || !receiver) return res.status(404).json({ message: 'User account not found' });

    if (!sender.sentRequests.includes(receiverName)) {
      sender.sentRequests.push(receiverName);
      receiver.receivedRequests.push(senderName);
      
      await sender.save();
      await receiver.save();
    }
    res.json({ message: 'Request sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept Friend Request
// @route   POST /api/users/accept
// @access  Private
export const acceptFriendRequest = async (req, res) => {
  const { senderName, notificationId } = req.body;
  const receiverName = req.user.name; // Authenticated user accepting
  try {
    if (!senderName) return res.status(400).json({ message: 'Sender name is required' });
    const sender = await findUserByName(senderName);
    const receiver = await User.findById(req.user._id);

    if (!sender || !receiver) return res.status(404).json({ message: 'User account not found' });

    // Validate that receiver actually received a request from sender
    if (!receiver.receivedRequests || !receiver.receivedRequests.includes(senderName)) {
      return res.status(400).json({ message: 'No pending friend request from this user' });
    }

    // Remove requests
    sender.sentRequests = sender.sentRequests.filter(name => name !== receiverName);
    receiver.receivedRequests = receiver.receivedRequests.filter(name => name !== senderName);

    // Add friends
    if (!sender.friends.includes(receiverName)) sender.friends.push(receiverName);
    if (!receiver.friends.includes(senderName)) receiver.friends.push(senderName);

    await sender.save();
    await receiver.save();

    // Update the notification so it doesn't loop
    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, {
        $set: { type: 'system', message: `You are now friends with ${senderName}!` }
      });
    }

    res.json({ message: 'Request accepted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unfriend
// @route   POST /api/users/unfriend
// @access  Private
export const unfriend = async (req, res) => {
  const { friendName } = req.body;
  const userName = req.user.name;
  try {
    const user = await User.findById(req.user._id);
    const friend = await findUserByName(friendName);

    if (!user || !friend) return res.status(404).json({ message: 'User not found' });

    user.friends = user.friends.filter(name => name !== friendName);
    friend.friends = friend.friends.filter(name => name !== userName);

    await user.save();
    await friend.save();

    res.json({ message: 'Unfriended successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Follow a User
// @route   POST /api/users/follow
// @access  Private
export const followUser = async (req, res) => {
  const { targetName } = req.body;
  const followerName = req.user.name;
  try {
    if (!targetName) return res.status(400).json({ message: 'Target user is required' });
    if (followerName === targetName) return res.status(400).json({ message: 'Cannot follow yourself' });

    const follower = await User.findById(req.user._id);
    const target = await findUserByName(targetName);

    if (!follower || !target) return res.status(404).json({ message: 'Target user not found' });

    if (!follower.following.includes(targetName)) {
      follower.following.push(targetName);
      await follower.save();
    }
    
    if (!target.followers.includes(followerName)) {
      target.followers.push(followerName);
      await target.save();
      
      const isMutual = target.following.includes(followerName);
      let message = `${follower.name} started following you.`;
      
      if (isMutual) {
        message = `${follower.name} followed you back. You can now message each other.`;
      }
      
      // Notify target
      await Notification.create({
        userId: String(target._id),
        type: 'follow',
        message
      });
    }

    res.json({ message: `Successfully followed ${targetName}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unfollow a User
// @route   POST /api/users/unfollow
// @access  Private
export const unfollowUser = async (req, res) => {
  const { targetName } = req.body;
  const followerName = req.user.name;
  try {
    const follower = await User.findOne({ name: followerName });
    const target = await User.findOne({ name: targetName });

    if (follower) {
      follower.following = follower.following.filter(name => name !== targetName);
      await follower.save();
    }
    
    if (target) {
      target.followers = target.followers.filter(name => name !== followerName);
      await target.save();
    }

    res.json({ message: `Successfully unfollowed ${targetName}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user dashboard summary metrics & assigned gym plans
// @route   GET /api/users/dashboard/:name
// @access  Private / User, Assigned Trainer, Admin, SuperAdmin
export const getUserDashboardData = async (req, res) => {
  try {
    const { name } = req.params;
    const user = await User.findOne({ name }).select('-password -otpCode -otpExpiresAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    const caller = req.user;
    const isSelf = caller && (String(caller._id) === String(user._id) || caller.name === user.name);
    const isAdmin = caller && ['Admin', 'SuperAdmin'].includes(caller.role);
    const isAssignedTrainer = caller && caller.role === 'GymTrainer' && caller.assignedGymName && caller.assignedGymName === user.subscribedGymName;

    if (!isSelf && !isAdmin && !isAssignedTrainer) {
      return res.status(403).json({ message: 'Not authorized to view private dashboard data for this user' });
    }

    res.json({
      user,
      stats: {
        totalWorkouts: 18,
        runningDistanceKm: 24.5,
        caloriesBurned: 3450,
        currentStreakDays: 5
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve / Confirm user Google Gmail address
// @route   PUT /api/users/approve-gmail
// @access  Public
export const approveGmail = async (req, res) => {
  const { userName, notificationId, email } = req.body;
  try {
    const caller = req.user;
    if (!caller || (caller.name !== userName && !['Admin', 'SuperAdmin'].includes(caller.role))) {
      return res.status(403).json({ message: 'Not authorized to modify email verification settings' });
    }

    const user = await User.findOne({ name: userName });
    if (!user) return res.status(404).json({ message: 'User profile not found' });

    if (email) {
      user.email = email;
      user.recoveryEmail = email;
    }
    user.isEmailVerified = true;
    user.isGoogleApproved = true;
    if (!user.recoveryEmail) {
      user.recoveryEmail = user.email;
    }
    await user.save();

    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, {
        isRead: true,
        message: `✅ Google Gmail (${user.email}) verified & approved for account recovery.`
      });
    }

    res.json({ message: 'Google Gmail approved successfully!', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send 6-digit OTP for Gmail verification
// @route   POST /api/users/send-verification-otp
// @access  Public
export const sendVerificationOTP = async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) return res.status(400).json({ message: 'Email address is required.' });

  try {
    const targetEmail = email.trim().toLowerCase();
    const otp = crypto.randomInt(100000, 999999).toString();
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      await transporter.verify();
      const delivery = await transporter.sendMail({
        from: `"GymSync" <${process.env.EMAIL_USER}>`,
        to: targetEmail,
        subject: 'GymSync — Google Gmail Verification OTP',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#f8fafc;padding:40px;border-radius:16px;border:1px solid #1e293b;">
            <h2 style="color:#10b981;margin-bottom:8px;">Gmail Account Verification</h2>
            <p style="color:#94a3b8;margin-bottom:24px;">Your 6-digit authentication code to verify your GymSync account is:</p>
            <div style="background:#1e293b;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
              <span style="font-size:2.5rem;font-weight:bold;color:#10b981;letter-spacing:8px;">${otp}</span>
            </div>
            <p style="color:#94a3b8;font-size:0.85rem;">This code expires in <strong style="color:#f59e0b;">10 minutes</strong>. Do not share it with anyone.</p>
          </div>
        `
      });
      if (!delivery.messageId) throw new Error('The email provider did not accept the message.');
    } catch (mailErr) {
      console.error('Verification email delivery failed:', mailErr.message);
      return res.status(503).json({ message: 'We could not send the OTP email. Please check the mail configuration and try again.' });
    }

    if (req.user?._id) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.otpCode = otp;
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.otpVerified = false;
        await user.save();
      }
    }
    res.json({ message: 'Verification OTP sent to your Gmail address.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify 6-digit OTP & approve Gmail account
// @route   PUT /api/users/verify-email-otp
// @access  Public
export const verifyEmailOTP = async (req, res) => {
  const { email, otp, notificationId } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and 6-digit OTP code are required.' });

  try {
    const targetEmail = email.trim().toLowerCase();

    const user = req.user?._id ? await User.findById(req.user._id) : await User.findOne({ email: targetEmail });
    if (!user || !user.otpCode) return res.status(400).json({ message: 'No verification OTP requested for this email.' });

    const expiresAt = user.otpExpiresAt ? new Date(user.otpExpiresAt).getTime() : 0;
    if (Date.now() > expiresAt) {
      user.otpCode = null;
      user.otpExpiresAt = null;
      user.otpVerified = false;
      await user.save();
      return res.status(400).json({ message: 'OTP code has expired. Please request a new one.' });
    }
    if (user.otpCode !== otp.trim()) {
      return res.status(400).json({ message: 'Incorrect OTP code. Please check and try again.' });
    }

    const emailOwner = await User.findOne({ email: targetEmail });
    if (emailOwner && !emailOwner._id.equals(user._id)) {
      return res.status(400).json({ message: 'This email is already used by another account.' });
    }

    user.email = targetEmail;
    user.recoveryEmail = targetEmail;
    user.isEmailVerified = true;
    user.isGoogleApproved = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpVerified = true;
    await user.save();

    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, {
        isRead: true,
        message: `✅ Google Gmail (${targetEmail}) verified & approved for account recovery.`
      });
    }

    res.json({ message: '✅ Google Gmail authenticated & verified successfully!', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save workout progress (completed days, streak, points) to MongoDB with Supabase dual-sync
// @route   POST /api/users/workout-progress
// @access  Private
export const saveWorkoutProgressController = async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.name);
    const { planId, completedDays, streak, totalPoints, lastWorkoutCompletionTime } = req.body;

    // 1. Authoritative primary save to MongoDB
    const updatedMongo = await WorkoutProgress.findOneAndUpdate(
      { userId },
      {
        userId,
        planId: planId || null,
        completedDays: completedDays || [],
        streak: Number(streak) || 0,
        totalPoints: Number(totalPoints) || 0,
        lastWorkoutCompletionTime: lastWorkoutCompletionTime ? new Date(lastWorkoutCompletionTime) : new Date()
      },
      { new: true, upsert: true }
    );

    // 2. Dual-sync to Supabase if configured
    try {
      await upsertWorkoutProgress(userId, req.body);
    } catch (supaErr) {
      console.warn('[Supabase upsertWorkoutProgress Dual-Sync Notice]:', supaErr.message);
    }

    res.status(200).json({ success: true, progress: updatedMongo });
  } catch (err) {
    console.error('saveWorkoutProgressController Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get user workout progress from MongoDB with Supabase fallback
// @route   GET /api/users/workout-progress
// @access  Private
export const getWorkoutProgressController = async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.name);

    // 1. Authoritative fetch from MongoDB
    let progress = await WorkoutProgress.findOne({ userId }).lean();

    // 2. Fallback to Supabase if MongoDB empty (e.g. migration sync)
    if (!progress) {
      try {
        const supaProgress = await fetchWorkoutProgress(userId);
        if (supaProgress && supaProgress.completedDays?.length) {
          progress = await WorkoutProgress.create({
            userId,
            planId: supaProgress.planId,
            completedDays: supaProgress.completedDays,
            streak: supaProgress.streak || 0,
            totalPoints: supaProgress.totalPoints || 0,
            lastWorkoutCompletionTime: supaProgress.lastWorkoutCompletionTime
          });
        }
      } catch (supaErr) {
        console.warn('[Supabase fetchWorkoutProgress Notice]:', supaErr.message);
      }
    }

    res.status(200).json(progress || { completedDays: [], streak: 0, totalPoints: 0, planId: null });
  } catch (err) {
    console.error('getWorkoutProgressController Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Save individual exercise record to MongoDB with Supabase dual-sync
// @route   POST /api/users/exercise-record
// @access  Private
export const saveExerciseRecordController = async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.name);
    const {
      exerciseId,
      exerciseName,
      dayNumber,
      planId,
      setNumber,
      totalSets,
      repsCompleted,
      targetReps,
      pointsEarned,
      mode,
      aiConfidence,
      aiResult
    } = req.body;

    // 1. Authoritative primary save to MongoDB
    const mongoRecord = await ExerciseRecord.create({
      userId,
      exerciseId: exerciseId || 'EX-GEN',
      exerciseName: exerciseName || 'Exercise',
      dayNumber: Number(dayNumber) || 1,
      planId: planId || null,
      setNumber: Number(setNumber) || 1,
      totalSets: Number(totalSets) || 1,
      repsCompleted: Number(repsCompleted) || 0,
      targetReps: Number(targetReps) || 10,
      pointsEarned: Number(pointsEarned) || 1,
      mode: mode === 'ai' ? 'ai' : 'manual',
      aiConfidence: aiConfidence || null,
      aiResult: aiResult || {}
    });

    // 2. Dual-sync to Supabase if configured
    try {
      await saveUserExerciseRecord({ ...req.body, userId });
    } catch (supaErr) {
      console.warn('[Supabase saveUserExerciseRecord Dual-Sync Notice]:', supaErr.message);
    }

    res.status(201).json({ success: true, record: mongoRecord });
  } catch (err) {
    console.error('saveExerciseRecordController Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get user exercise history records from MongoDB with Supabase fallback
// @route   GET /api/users/exercise-records
// @access  Private
export const getExerciseRecordsController = async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.name);

    // 1. Authoritative fetch from MongoDB
    const records = await ExerciseRecord.find({ userId }).sort({ createdAt: -1 }).lean();

    // 2. Fallback to Supabase if MongoDB empty
    if (!records || records.length === 0) {
      try {
        const supaRecords = await fetchUserExerciseRecords(userId);
        if (supaRecords && supaRecords.length > 0) {
          return res.status(200).json(supaRecords);
        }
      } catch (supaErr) {
        console.warn('[Supabase fetchUserExerciseRecords Notice]:', supaErr.message);
      }
    }

    res.status(200).json(records || []);
  } catch (err) {
    console.error('getExerciseRecordsController Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Save user bio and onboarding metrics
// @route   PUT /api/users/bio
// @access  Private
export const saveUserBioController = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const bio = req.body || {};
    user.bioData = {
      mainGoalArea: bio.mainGoalArea || user.bioData?.mainGoalArea || '',
      goals: Array.isArray(bio.goals) ? bio.goals : user.bioData?.goals || [],
      planDuration: bio.planDuration || user.bioData?.planDuration || '1 Month',
      trainingDaysPerWeek: Number(bio.trainingDaysPerWeek) || user.bioData?.trainingDaysPerWeek || 3,
      equipmentAccess: bio.equipmentAccess || user.bioData?.equipmentAccess || 'Full Gym',
      pushupBaseline: Number(bio.pushupBaseline) || user.bioData?.pushupBaseline || 10,
      gender: bio.gender || user.bioData?.gender || '',
      dob: bio.dob || user.bioData?.dob || '',
      units: bio.units || user.bioData?.units || 'metric',
      height: Number(bio.height) || user.bioData?.height || 170,
      weight: Number(bio.weight) || user.bioData?.weight || 70,
      targetMuscles: Array.isArray(bio.targetMuscles) ? bio.targetMuscles : user.bioData?.targetMuscles || [],
      sport: bio.sport || user.bioData?.sport || '',
      fitnessLevel: bio.fitnessLevel || user.bioData?.fitnessLevel || 'Beginner',
      sessionDurationMins: Number(bio.sessionDurationMins) || user.bioData?.sessionDurationMins || 45,
      medicalConditions: Array.isArray(bio.medicalConditions) ? bio.medicalConditions : user.bioData?.medicalConditions || [],
      jointPain: Array.isArray(bio.jointPain) ? bio.jointPain : user.bioData?.jointPain || [],
      injuries: Array.isArray(bio.injuries) ? bio.injuries : user.bioData?.injuries || [],
      limitations: Array.isArray(bio.limitations) ? bio.limitations : user.bioData?.limitations || [],
      foodPreferences: bio.foodPreferences || user.bioData?.foodPreferences || ''
    };
    user.isOnboardingCompleted = true;

    await user.save();

    res.status(200).json({
      success: true,
      bioData: user.bioData,
      isOnboardingCompleted: user.isOnboardingCompleted
    });
  } catch (err) {
    console.error('saveUserBioController Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get user bio and onboarding status
// @route   GET /api/users/bio
// @access  Private
export const getUserBioController = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('bioData isOnboardingCompleted').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      bioData: user.bioData || null,
      isOnboardingCompleted: Boolean(user.isOnboardingCompleted)
    });
  } catch (err) {
    console.error('getUserBioController Error:', err);
    res.status(500).json({ message: err.message });
  }
};

