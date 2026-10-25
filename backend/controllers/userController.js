import mongoose from 'mongoose';
import User from '../models/User.js';
import Gym from '../models/Gym.js';
import Notification from '../models/Notification.js';
import Post from '../models/Post.js';
import Message from '../models/Message.js';
import WorkoutProgress from '../models/WorkoutProgress.js';
import ExerciseRecord from '../models/ExerciseRecord.js';
import ActivityLog from '../models/ActivityLog.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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
import PDFDocument from 'pdfkit';

// @desc    Get all users (for friend search and member directory)
// @route   GET /api/users
// @access  Private
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('_id name profilePic role subscribedGymName friends followers');
    res.json(users);
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// @desc    Get trainers for a gym or all trainers
// @route   GET /api/users/trainers
// @access  Private
export const getTrainers = async (req, res) => {
  try {
    const { gym } = req.query;
    const trainerRoles = ['GymTrainer', 'gym_trainer', 'FitnessInstructor', 'fitness_instructor', 'gymtrainer', 'fitnessinstructor'];
    const query = { role: { $in: trainerRoles } };
    if (gym) {
      query.$or = [
        { assignedGym: gym },
        { subscribedGymName: gym }
      ];
    }
    const trainers = await User.find(query).select('_id name profilePic role email assignedGym');
    res.json(trainers);
  } catch (error) {
    console.error('getTrainers error:', error);
    res.json([]);
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
    console.error('getGymMembers error:', error);
    res.status(500).json({ message: 'Failed to fetch gym members' });
  }
};

// Deterministic calendar streak computation
export const calculateConsecutiveCalendarStreak = (lastCompletionDate, newCompletionDate, currentStreak = 0) => {
  if (!lastCompletionDate) return 1;
  
  const d1 = new Date(lastCompletionDate);
  const d2 = new Date(newCompletionDate || Date.now());

  const day1Utc = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
  const day2Utc = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());
  
  const diffDays = Math.round((day2Utc - day1Utc) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Same calendar day: streak maintained
    return Math.max(1, currentStreak);
  } else if (diffDays === 1) {
    // Exactly consecutive calendar day: streak increments!
    return Math.max(1, currentStreak) + 1;
  } else if (diffDays < 0) {
    return Math.max(1, currentStreak);
  } else {
    // 2 or more calendar days gap: streak broken, resets to 1 for this new workout
    return 1;
  }
};

export const getActiveStreak = (progressDoc) => {
  if (!progressDoc || !progressDoc.lastWorkoutCompletionTime || !progressDoc.streak) {
    return 0;
  }
  const lastDate = new Date(progressDoc.lastWorkoutCompletionTime);
  const now = new Date();
  const dayLast = Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), lastDate.getUTCDate());
  const dayNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((dayNow - dayLast) / (1000 * 60 * 60 * 24));
  
  // If last workout was completed today (0) or yesterday (1), the active streak holds!
  // If 2 or more calendar days have elapsed without a workout, active streak has expired (0).
  if (diffDays <= 1) {
    return progressDoc.streak;
  }
  return 0;
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
      const userObj = user.toObject();
      const workoutCount = await WorkoutProgress.countDocuments({ 
        $or: [{ userId: String(user._id) }, { userId: user.name }] 
      });
      const postCount = await Post.countDocuments({ 
        $or: [{ authorId: user._id }, { authorName: user.name }] 
      });

      const progressDoc = await WorkoutProgress.findOne({
        $or: [{ userId: String(user._id) }, { userId: user.name }]
      });

      // Calculate true consecutive calendar-day active streak
      const calculatedStreak = getActiveStreak(progressDoc);

      userObj.points = (progressDoc?.totalPoints && progressDoc.totalPoints > 0)
        ? progressDoc.totalPoints
        : (userObj.points ?? (workoutCount * 10 + postCount * 5));
      userObj.streak = calculatedStreak;
      userObj.postCount = postCount;
      userObj.workoutCount = workoutCount;
      res.json(userObj);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('getUserByName error:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
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
    console.error('updateProfilePic error:', error);
    res.status(500).json({ message: 'Failed to update profile picture' });
  }
};

export const updateGymMembershipSettings = async (req, res) => {
  try {
    if (req.body.cancelRenewal === true) {
      req.user.gymAutoRenew = false;
    } else if (req.body.autoRenew !== undefined) {
      req.user.gymAutoRenew = Boolean(req.body.autoRenew);
    }
    await req.user.save();
    res.json({
      success: true,
      gymAutoRenew: req.user.gymAutoRenew,
      gymMembershipExpiresAt: req.user.gymMembershipExpiresAt,
      message: req.body.cancelRenewal
        ? `Auto-renewal cancelled. Your membership remains active until ${req.user.gymMembershipExpiresAt ? new Date(req.user.gymMembershipExpiresAt).toLocaleDateString() : 'expiry'}.`
        : 'Membership settings updated'
    });
  } catch (error) {
    console.error('updateGymMembershipSettings error:', error);
    res.status(500).json({ message: 'Failed to update membership settings' });
  }
};

// @desc    Soft-delete the currently authenticated account (move to Recycle Bin for 15 days)
// @route   DELETE /api/users/me
// @access  Private
export const deleteCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletionScheduledPermanentAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days grace period
    user.deletedBy = 'Self';
    user.accountStatus = 'Deleted';
    await user.save();

    // Dispatch Urgent Security Email Alert
    if (user.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const expiryDateStr = new Date(Date.now() + 15 * 86400000).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        await transporter.sendMail({
          from: `"GymSync Security" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: '⚠️ Urgent Security Alert: GymSync Account Deletion Scheduled',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 32px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #334155;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                <h2 style="color: #ef4444; margin: 0; font-size: 20px;">⚠️ Urgent Security Notice: Account Deletion Scheduled</h2>
              </div>
              <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0;">
                Hello <strong>${user.name || 'Athlete'}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Your GymSync account was placed into the <strong>15-Day Recycle Bin Grace Period</strong> today.
              </p>
              <div style="background-color: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0;">
                <strong style="color: #f87171; display: block; font-size: 14px; margin-bottom: 6px;">Did you request this deletion?</strong>
                <p style="color: #e2e8f0; font-size: 13px; line-height: 1.5; margin: 0;">
                  If you <strong>DID NOT</strong> initiate this deletion, your account may be compromised. Your data is safe in the Recycle Bin until <strong>${expiryDateStr}</strong>.
                </p>
              </div>
              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                To cancel this deletion and instantly restore full access to your profile, workouts, and memberships, simply log in to your account:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #6366f1; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                  Log In & Restore My Account
                </a>
              </div>
              <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 16px; margin-top: 24px;">
                If you did request this, no further action is needed. Your account and personal records will be permanently purged after 15 days.
              </p>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('Failed to dispatch deletion alert email:', mailErr.message);
      }
    }

    return res.json({ 
      message: 'Your account has been moved to the Recycle Bin and will be permanently deleted after 15 days. You can log in anytime within 15 days to cancel deletion and restore your account.' 
    });
  } catch (error) {
    console.error('deleteCurrentUser error:', error);
    return res.status(500).json({ message: 'Failed to delete account' });
  }
};

// @desc    Update General Profile Settings (Name, Phone, Fitness Goal, Bio)
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfileController = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, phone, fitnessGoal, bio, city, country, location, sudoPassword } = req.body;

    if (name && name.trim()) {
      const trimmedName = name.trim();
      if (trimmedName.toLowerCase() !== user.name.toLowerCase()) {
        // If sudoPassword is provided, verify it for sensitive name changes
        if (sudoPassword) {
          const isMatch = await bcrypt.compare(sudoPassword, user.password);
          if (!isMatch) {
            return res.status(401).json({ message: 'Invalid password. 2MFA verification failed for name change.' });
          }
        }

        const existing = await User.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
        if (existing && String(existing._id) !== String(user._id)) {
          return res.status(400).json({ message: `Username '${trimmedName}' is already taken by another member` });
        }
        user.name = trimmedName;
      }
    }

    if (phone !== undefined) user.phone = String(phone).trim();
    if (city !== undefined) user.city = String(city).trim();
    if (country !== undefined) user.country = String(country).trim();
    if (location !== undefined) {
      user.location = String(location).trim();
    } else if (city !== undefined || country !== undefined) {
      user.location = [user.city, user.country].filter(Boolean).join(', ');
    }

    if (fitnessGoal !== undefined) {
      user.fitnessGoal = String(fitnessGoal).trim();
      if (!user.bioData) user.bioData = {};
      user.bioData.mainGoalArea = String(fitnessGoal).trim();
    }
    if (bio !== undefined) user.bio = String(bio).trim();

    await user.save();

    return res.json({
      message: 'Profile settings updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        city: user.city || '',
        country: user.country || '',
        location: user.location || '',
        fitnessGoal: user.fitnessGoal || '',
        bio: user.bio || '',
        profilePic: user.profilePic || ''
      }
    });
  } catch (error) {
    console.error('updateUserProfileController error:', error);
    return res.status(500).json({ message: 'Failed to update profile settings' });
  }
};

// @desc    Deactivate the currently authenticated account temporarily
// @route   PUT /api/users/deactivate
// @access  Private
export const deactivateCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isDeactivated = true;
    user.deactivatedAt = new Date();
    user.accountStatus = 'Deactivated';
    await user.save();

    return res.json({ 
      message: 'Your account has been deactivated. You can reactivate it at any time simply by logging back in.' 
    });
  } catch (error) {
    console.error('deactivateCurrentUser error:', error);
    return res.status(500).json({ message: 'Failed to deactivate account' });
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
    console.error('sendFriendRequest error:', error);
    res.status(500).json({ message: 'Failed to send friend request' });
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
    console.error('acceptFriendRequest error:', error);
    res.status(500).json({ message: 'Failed to accept friend request' });
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
    console.error('unfriend error:', error);
    res.status(500).json({ message: 'Failed to unfriend user' });
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
    console.error('followUser error:', error);
    res.status(500).json({ message: 'Failed to follow user' });
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
    console.error('unfollowUser error:', error);
    res.status(500).json({ message: 'Failed to unfollow user' });
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

    const progressDoc = await WorkoutProgress.findOne({
      $or: [{ userId: String(user._id) }, { userId: user.name }]
    });
    const totalWorkoutRecords = await ExerciseRecord.countDocuments({
      $or: [{ userId: String(user._id) }, { userId: user.name }]
    });
    const currentStreakDays = getActiveStreak(progressDoc);

    res.json({
      user,
      stats: {
        totalWorkouts: Math.max(totalWorkoutRecords, progressDoc?.completedDays?.length || 0),
        runningDistanceKm: Math.round(((totalWorkoutRecords * 1.5) + Number.EPSILON) * 10) / 10,
        caloriesBurned: totalWorkoutRecords * 180,
        currentStreakDays
      }
    });
  } catch (error) {
    console.error('getUserDashboardData error:', error);
    res.status(500).json({ message: 'Failed to fetch user dashboard data' });
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
    console.error('approveGmail error:', error);
    res.status(500).json({ message: 'Failed to approve Google Gmail address' });
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

    const user = req.user?._id 
      ? await User.findById(req.user._id) 
      : (req.body.userName ? await User.findOne({ name: req.body.userName }) : await User.findOne({ email: targetEmail }));

    if (user) {
      user.otpCode = otp;
      user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user.otpVerified = false;
      await user.save();
    }
    res.json({ message: 'Verification OTP sent to your Gmail address.' });
  } catch (error) {
    console.error('sendGoogleVerificationOTP error:', error);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
};

// @desc    Verify 6-digit OTP & approve Gmail account
// @route   PUT /api/users/verify-email-otp
// @access  Public
export const verifyEmailOTP = async (req, res) => {
  const { email, otp, userName, notificationId } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and 6-digit OTP code are required.' });

  try {
    const targetEmail = email.trim().toLowerCase();

    const user = req.user?._id 
      ? await User.findById(req.user._id) 
      : (userName ? await User.findOne({ name: userName }) : await User.findOne({ email: targetEmail }));
    if (!user || !user.otpCode) return res.status(400).json({ message: 'No verification OTP requested for this account.' });

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
    console.error('verifyEmailOTP error:', error);
    res.status(500).json({ message: 'Failed to verify OTP code' });
  }
};

// @desc    Save workout progress (completed days, streak, points) to MongoDB with Supabase dual-sync
// @route   POST /api/users/workout-progress
// @access  Private
export const saveWorkoutProgressController = async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.name);
    const { planId, completedDays, totalPoints, lastWorkoutCompletionTime } = req.body;

    const existingProgress = await WorkoutProgress.findOne({ userId });
    const completionTime = lastWorkoutCompletionTime ? new Date(lastWorkoutCompletionTime) : new Date();

    // Server-computed deterministic streak: cannot be spoofed by client
    let computedStreak = 1;
    if (existingProgress && existingProgress.lastWorkoutCompletionTime) {
      computedStreak = calculateConsecutiveCalendarStreak(
        existingProgress.lastWorkoutCompletionTime,
        completionTime,
        existingProgress.streak || 0
      );
    } else if (req.body.streak && Number(req.body.streak) === 1) {
      computedStreak = 1;
    }

    // 1. Authoritative primary save to MongoDB
    const updatedMongo = await WorkoutProgress.findOneAndUpdate(
      { userId },
      {
        userId,
        planId: planId || null,
        completedDays: completedDays || [],
        streak: computedStreak,
        totalPoints: Number(totalPoints) || (existingProgress?.totalPoints ? existingProgress.totalPoints + 10 : 10),
        lastWorkoutCompletionTime: completionTime
      },
      { returnDocument: 'after', upsert: true }
    );

    // 2. Dual-sync to Supabase if configured
    try {
      await upsertWorkoutProgress(userId, {
        planId,
        completedDays,
        streak: computedStreak,
        totalPoints: updatedMongo.totalPoints,
        lastWorkoutCompletionTime: completionTime
      });
    } catch (supaErr) {
      console.warn('[Supabase upsertWorkoutProgress Dual-Sync Notice]:', supaErr.message);
    }

    res.status(200).json({ success: true, progress: updatedMongo });
  } catch (err) {
    console.error('saveWorkoutProgressController Error:', err);
    res.status(500).json({ message: 'Failed to save workout progress' });
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
    res.status(500).json({ message: 'Failed to fetch workout progress' });
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

    // 2. Synchronize to daily ActivityLog for unified history and calories
    try {
      const today = new Date().toISOString().split('T')[0];
      const caloriesEst = Math.max(12, Math.round((Number(repsCompleted) || 10) * 0.4));
      let actLog = await ActivityLog.findOne({ userId: req.user._id, date: today });
      if (!actLog) {
        actLog = new ActivityLog({
          userId: req.user._id,
          date: today,
          steps: 0,
          distanceKm: 0,
          activeMinutes: 0,
          estimatedWalkingCalories: 0,
          workoutCalories: 0,
          totalCaloriesBurned: 0,
          exercises: []
        });
      }
      actLog.exercises.push({
        name: exerciseName || 'Exercise',
        sets: Number(setNumber) || 1,
        reps: Number(repsCompleted) || 0,
        caloriesBurned: caloriesEst,
        mode: mode === 'ai' ? 'ai' : 'manual',
        completedAt: new Date()
      });
      actLog.workoutCalories = (actLog.workoutCalories || 0) + caloriesEst;
      actLog.totalCaloriesBurned = (actLog.estimatedWalkingCalories || 0) + actLog.workoutCalories;
      actLog.lastSyncedAt = new Date();
      await actLog.save();
    } catch (actErr) {
      console.warn('ActivityLog sync notice:', actErr.message);
    }

    // 3. Dual-sync to Supabase if configured
    try {
      await saveUserExerciseRecord({ ...req.body, userId });
    } catch (supaErr) {
      console.warn('[Supabase saveUserExerciseRecord Dual-Sync Notice]:', supaErr.message);
    }

    res.status(201).json({ success: true, record: mongoRecord });
  } catch (err) {
    console.error('saveExerciseRecordController Error:', err);
    res.status(500).json({ message: 'Failed to save exercise record' });
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
    res.status(500).json({ message: 'Failed to fetch exercise records' });
  }
};

// @desc    Download a user's completed activity and workout-record history as a PDF
// @route   GET /api/users/workout-history/export-pdf
// @access  Private
export const exportWorkoutHistoryPdfController = async (req, res) => {
  try {
    const objectUserId = req.user._id;
    const recordUserId = String(objectUserId || req.user.name);
    const [activities, records, progress] = await Promise.all([
      ActivityLog.find({ userId: objectUserId }).sort({ date: -1 }).lean(),
      ExerciseRecord.find({ userId: recordUserId }).sort({ createdAt: -1 }).lean(),
      WorkoutProgress.findOne({ userId: recordUserId }).lean()
    ]);

    const totalCalories = activities.reduce((sum, activity) => sum + (Number(activity.totalCaloriesBurned) || 0), 0);
    const totalExercises = activities.reduce((sum, activity) => sum + (activity.exercises?.length || 0), 0) || records.length;
    const filename = `gymsync-workout-history-${new Date().toISOString().slice(0, 10)}.pdf`;

    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
    res.setHeader('Cache-Control', 'no-store');

    const doc = new PDFDocument({ margin: 48, size: 'A4', info: { Title: 'GymSync Workout History' } });
    doc.pipe(res);
    doc.fillColor('#2563eb').fontSize(24).text('GymSync Workout History');
    doc.fillColor('#475569').fontSize(10).text(`Prepared for ${req.user.name || 'GymSync athlete'} on ${new Date().toLocaleDateString()}`);
    doc.moveDown(1.5);
    doc.fillColor('#0f172a').fontSize(14).text('Your summary');
    doc.moveDown(0.4).fontSize(10);
    doc.text(`Workout days logged: ${activities.length}`);
    doc.text(`Exercises completed: ${totalExercises}`);
    doc.text(`Calories burned: ${Math.round(totalCalories).toLocaleString()} kcal`);
    doc.text(`Current streak: ${progress?.streak || 0} day${progress?.streak === 1 ? '' : 's'}`);
    doc.moveDown(1.3);
    doc.fontSize(14).text('Completed sessions');
    doc.moveDown(0.4);

    if (!activities.length) {
      doc.fontSize(10).fillColor('#475569').text('No completed workout sessions have been logged yet. Complete a workout to see it here.');
    } else {
      activities.forEach((activity, index) => {
        if (doc.y > 700) doc.addPage();
        const exercises = (activity.exercises || []).map(item => `${item.name} (${item.sets || 1} sets, ${item.reps || 0} reps)`).join(', ') || 'Activity synced from device';
        doc.fillColor('#0f172a').fontSize(11).text(`${activity.date}  -  ${Math.round(activity.totalCaloriesBurned || 0)} kcal`);
        doc.fillColor('#475569').fontSize(9).text(exercises, { indent: 10 });
        if (index < activities.length - 1) doc.moveDown(0.7);
      });
    }

    doc.moveDown(1.5).fillColor('#64748b').fontSize(8).text('This report is an activity record, not medical advice. Calorie values are estimates.', { align: 'center' });
    doc.end();
  } catch (err) {
    console.error('exportWorkoutHistoryPdfController Error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Failed to export workout history PDF' });
    else res.end();
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
      foodPreferences: Array.isArray(bio.foodPreferences) 
        ? bio.foodPreferences.map(s => String(s).trim()).filter(Boolean).join(', ')
        : (bio.foodPreferences != null ? String(bio.foodPreferences).trim() : user.bioData?.foodPreferences || '')
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
    res.status(500).json({ message: 'Failed to save bio data' });
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
    res.status(500).json({ message: 'Failed to fetch user bio' });
  }
};
