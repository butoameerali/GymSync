import User from '../models/User.js';
import Notification from '../models/Notification.js';

// @desc    Get all users (for public profiles and friend search)
// @route   GET /api/users
// @access  Public
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a user by name (for public profile)
// @route   GET /api/users/:name
// @access  Public
export const getUserByName = async (req, res) => {
  try {
    const user = await User.findOne({ name: req.params.name }).select('-password');
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
  const { name, profilePic } = req.body;
  try {
    const user = await User.findOne({ name });
    if (user) {
      user.profilePic = profilePic;
      await user.save();
      res.json({ message: 'Profile picture updated', profilePic: user.profilePic });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper to auto-create mock users for FYP continuity
const ensureUser = async (name) => {
  let user = await User.findOne({ name });
  if (!user) {
    user = new User({
      name,
      email: `${name.replace(/\s+/g, '')}${Math.floor(Math.random() * 100000)}@example.com`,
      password: 'mockpassword123',
      role: 'User'
    });
    await user.save();
  }
  return user;
};

// @desc    Send Friend Request
// @route   POST /api/users/request
// @access  Public
export const sendFriendRequest = async (req, res) => {
  const { senderName, receiverName } = req.body;
  try {
    const sender = await ensureUser(senderName);
    const receiver = await ensureUser(receiverName);

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
// @access  Public
export const acceptFriendRequest = async (req, res) => {
  const { senderName, receiverName, notificationId } = req.body; // receiverName is the one accepting
  try {
    const sender = await ensureUser(senderName);
    const receiver = await ensureUser(receiverName);

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
// @access  Public
export const unfriend = async (req, res) => {
  const { userName, friendName } = req.body;
  try {
    const user = await User.findOne({ name: userName });
    const friend = await User.findOne({ name: friendName });

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
// @access  Public
export const followUser = async (req, res) => {
  const { followerName, targetName } = req.body;
  try {
    const follower = await ensureUser(followerName);
    const target = await ensureUser(targetName);

    if (!follower.following.includes(targetName)) {
      follower.following.push(targetName);
      await follower.save();
    }
    
    if (!target.followers.includes(followerName)) {
      target.followers.push(followerName);
      await target.save();
      
      // Notify target
      await Notification.create({
        recipient: target.name,
        type: 'follow',
        message: `${follower.name} started following you.`,
        senderName: follower.name
      });
    }

    res.json({ message: `Successfully followed ${targetName}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unfollow a User
// @route   POST /api/users/unfollow
// @access  Public
export const unfollowUser = async (req, res) => {
  const { followerName, targetName } = req.body;
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
// @access  Public / User
export const getUserDashboardData = async (req, res) => {
  try {
    const { name } = req.params;
    const user = await User.findOne({ name }).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
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
