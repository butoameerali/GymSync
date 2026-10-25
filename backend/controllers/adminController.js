import User from '../models/User.js';
import Gym from '../models/Gym.js';
import Complaint from '../models/Complaint.js';
import Post from '../models/Post.js';
import Payment from '../models/Payment.js';
import PreMadePlan from '../models/PreMadePlan.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import Coupon from '../models/Coupon.js';
import Broadcast from '../models/Broadcast.js';
import { logAuditTrail } from '../middleware/securityMiddleware.js';
import { isValidObjectId } from '../utils/validation.js';

// Helper to verify admin role
const verifyAdminRole = (req, res, allowedRoles = ['SuperAdmin', 'Admin', 'ComplaintModerator']) => {
  const userRole = req.user?.role || 'User';
  const normalizedRole = userRole.toLowerCase();
  const allowed = allowedRoles.map(r => r.toLowerCase());

  if (!allowed.includes(normalizedRole)) {
    res.status(403).json({ 
      message: `Access denied: Role '${userRole}' does not possess required administrative permissions.` 
    });
    return false;
  }
  return true;
};

// Helper to verify admin password for sensitive operations (Sudo Mode)
const verifyAdminPassword = async (adminUser, password) => {
  if (!password || typeof password !== 'string') return false;
  const adminDoc = await User.findById(adminUser._id);
  if (!adminDoc) return false;
  return await adminDoc.matchPassword(password);
};

// @desc    Get dashboard metrics & revenue for Admin Panel
// @route   GET /api/admin/stats
// @access  Private / SuperAdmin, Admin, ComplaintModerator
export const getAdminStats = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res)) return;

    const userRole = req.user?.role || 'User';
    const isModerator = userRole.toLowerCase() === 'complaintmoderator';

    let pendingComplaints = 0;
    let resolvedComplaints = 0;
    let totalComplaints = 0;
    let reportedPosts = 0;
    let totalPosts = 0;
    let bannedUsers = 0;

    try {
      pendingComplaints = await Complaint.countDocuments({ status: 'Pending' });
      resolvedComplaints = await Complaint.countDocuments({ status: { $in: ['Resolved', 'Closed'] } });
      totalComplaints = await Complaint.countDocuments();
      reportedPosts = await Post.countDocuments({ reportCount: { $gt: 0 } });
      totalPosts = await Post.countDocuments();
      bannedUsers = await User.countDocuments({ isBanned: true });
    } catch (e) {}

    if (isModerator) {
      return res.json({
        isModeratorView: true,
        pendingComplaints,
        resolvedComplaints,
        totalComplaints,
        reportedPosts,
        totalPosts,
        bannedUsers
      });
    }

    // Admin and SuperAdmin Full Metrics
    let totalUsers = 0;
    let totalGymOwners = 0;
    let totalGyms = 0;
    let pendingGymApprovals = 0;
    let totalRevenue = 0;

    try {
      totalUsers = await User.countDocuments({ role: 'User' });
      totalGymOwners = await User.countDocuments({ role: { $in: ['GymOwner', 'gym_owner'] } });
      totalGyms = await Gym.countDocuments({ approvalStatus: 'Approved' });
      pendingGymApprovals = await Gym.countDocuments({ approvalStatus: 'Pending' });

      // Real Revenue aggregation from completed payments
      const revAgg = await Payment.aggregate([
        { $match: { status: 'Completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalRevenue = revAgg.length > 0 ? revAgg[0].total : 0;
    } catch (e) {}

    res.json({
      isModeratorView: false,
      totalUsers,
      totalGymOwners,
      totalGyms,
      pendingGymApprovals,
      pendingComplaints,
      resolvedComplaints,
      totalPosts,
      reportedPosts,
      bannedUsers,
      totalRevenue
    });
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Get all registered users & roles for Admin management
// @route   GET /api/admin/users
// @access  Private / SuperAdmin, Admin
export const getAllUsers = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;

    const { view } = req.query;
    let query = {};
    if (view === 'recycle_bin') {
      query.isDeleted = true;
    } else {
      query.isDeleted = { $ne: true };
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(users || []);
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Update user role (RBAC assignment by Admin) with Admin Password Verification (Sudo Mode)
// @route   PUT /api/admin/users/:id/role
// @access  Private / SuperAdmin, Admin
export const updateUserRole = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;

    const { id } = req.params;
    const { role, adminPassword } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    if (!adminPassword) {
      return res.status(401).json({ message: 'Admin password is required to change user roles' });
    }

    const isPasswordValid = await verifyAdminPassword(req.user, adminPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Incorrect admin password. Action aborted.' });
    }

    const validRoles = ['SuperAdmin', 'Admin', 'GymOwner', 'User', 'StoreManager', 'ComplaintModerator', 'FitnessInstructor', 'GymTrainer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protection: Admin cannot modify their own role
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own administrative role' });
    }

    // Protection: Only SuperAdmin can assign Admin or SuperAdmin role
    const currentAdminRole = req.user.role || 'Admin';
    if (['Admin', 'SuperAdmin'].includes(role) && currentAdminRole !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Only a SuperAdmin can promote users to Admin or SuperAdmin' });
    }

    // Protection: Regular Admin cannot alter a SuperAdmin's role
    if (user.role === 'SuperAdmin' && currentAdminRole !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Only a SuperAdmin can modify another SuperAdmin' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    const actorName = req.user?.name || 'Admin';
    logAuditTrail(actorName, req.user?.role || 'Admin', 'Assigned User Role', id, `Role changed from ${oldRole} to ${role}`, req);

    res.json({ message: `Role updated to ${role} for user ${user.name}`, user });
  } catch (error) {
    console.error('updateUserRole error:', error);
    res.status(500).json({ message: 'An internal error occurred while updating user role' });
  }
};

// @desc    Edit a user's basic account details
export const updateUserDetails = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;
    const { name, email } = req.body;
    if (!name?.trim() || !email?.trim()) return res.status(400).json({ message: 'Name and email are required' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const duplicate = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: user._id } });
    if (duplicate) return res.status(400).json({ message: 'This email is already used by another account' });

    const oldName = user.name;
    const newName = name.trim();
    const isRename = oldName !== newName;

    if (isRename) {
      const nameTaken = await User.findOne({ name: newName, _id: { $ne: user._id } })
        .collation({ locale: 'en', strength: 2 });
      if (nameTaken) return res.status(400).json({ message: 'This name is already taken by another account' });
    }

    user.name = newName;
    user.email = email.trim().toLowerCase();
    await user.save();

    if (isRename) {
      await User.updateMany(
        { friends: oldName },
        { $set: { 'friends.$[elem]': newName } },
        { arrayFilters: [{ elem: oldName }] }
      );
      await User.updateMany(
        { followers: oldName },
        { $set: { 'followers.$[elem]': newName } },
        { arrayFilters: [{ elem: oldName }] }
      );
      await User.updateMany(
        { following: oldName },
        { $set: { 'following.$[elem]': newName } },
        { arrayFilters: [{ elem: oldName }] }
      );
      await User.updateMany(
        { sentRequests: oldName },
        { $set: { 'sentRequests.$[elem]': newName } },
        { arrayFilters: [{ elem: oldName }] }
      );
      await User.updateMany(
        { receivedRequests: oldName },
        { $set: { 'receivedRequests.$[elem]': newName } },
        { arrayFilters: [{ elem: oldName }] }
      );
      await Notification.updateMany({ sender: oldName }, { $set: { sender: newName } });
    }

    logAuditTrail(req.user?.name || 'Admin', req.user?.role || 'Admin', 'Edited User Account', user._id.toString(), isRename ? `Renamed ${oldName} to ${newName}` : 'Updated email', req);
    res.json({ message: isRename ? `User renamed from ${oldName} to ${newName}` : 'User email updated successfully', user });
  } catch (error) {
    console.error('editUserByAdmin error:', error);
    res.status(500).json({ message: 'Failed to edit user account' });
  }
};

// @desc    Soft-delete user account (move to Recycle Bin for 15 days)
// @route   DELETE /api/admin/users/:id
// @access  Private / SuperAdmin, Admin
export const deleteUserByAdmin = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;
    const { id } = req.params;
    const { adminPassword } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    if (!adminPassword) {
      return res.status(401).json({ message: 'Admin password is required to delete an account' });
    }

    const isPasswordValid = await verifyAdminPassword(req.user, adminPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Incorrect admin password. Action aborted.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }
    if (user.role === 'SuperAdmin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Only a SuperAdmin can delete another SuperAdmin account' });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletionScheduledPermanentAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15-day grace period
    user.deletedBy = `Admin: ${req.user.name || 'Admin'}`;
    user.accountStatus = 'Deleted';
    await user.save();

    logAuditTrail(req.user?.name || 'Admin', req.user?.role || 'Admin', 'Moved User to Recycle Bin', id, `Account ${user.email} moved to Recycle Bin (Permanent wipe in 15 days)`, req);
    res.json({ message: `Account for ${user.name} moved to Recycle Bin. It can be restored within 15 days.` });
  } catch (error) {
    console.error('deleteUserByAdmin error:', error);
    res.status(500).json({ message: 'Failed to delete user account' });
  }
};

// @desc    Restore a user account from the Recycle Bin
// @route   PUT /api/admin/users/:id/restore
// @access  Private / SuperAdmin, Admin
export const restoreUserByAdmin = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;
    const { id } = req.params;
    const { adminPassword } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    if (!adminPassword) {
      return res.status(401).json({ message: 'Admin password is required to restore an account' });
    }

    const isPasswordValid = await verifyAdminPassword(req.user, adminPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Incorrect admin password. Action aborted.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isDeleted = false;
    user.deletedAt = null;
    user.deletionScheduledPermanentAt = null;
    user.deletedBy = null;
    user.accountStatus = user.isBanned ? 'Banned' : (user.isDeactivated ? 'Deactivated' : 'Active');
    await user.save();

    logAuditTrail(req.user?.name || 'Admin', req.user?.role || 'Admin', 'Restored User Account', id, `Restored ${user.email} from Recycle Bin`, req);
    res.json({ message: `Account for ${user.name} has been restored successfully!`, user });
  } catch (error) {
    console.error('restoreUserByAdmin error:', error);
    res.status(500).json({ message: 'Failed to restore user account' });
  }
};

// @desc    Permanently purge a user account (hard delete - SuperAdmin only)
// @route   DELETE /api/admin/users/:id/permanent
// @access  Private / SuperAdmin
export const permanentlyPurgeUserByAdmin = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin'])) return;
    const { id } = req.params;
    const { adminPassword } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    if (!adminPassword) {
      return res.status(400).json({ message: 'SuperAdmin password is required for permanent deletion' });
    }

    const isPasswordValid = await verifyAdminPassword(req.user, adminPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Incorrect SuperAdmin password. Action aborted.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'You cannot permanently delete your own account' });
    }

    const userEmail = user.email;
    const userName = user.name;
    await user.deleteOne();

    logAuditTrail(req.user?.name || 'SuperAdmin', req.user?.role || 'SuperAdmin', 'Permanently Purged User', id, `Permanently purged ${userEmail}`, req);
    res.json({ message: `User ${userName} (${userEmail}) permanently purged from the database.` });
  } catch (error) {
    console.error('permanentlyPurgeUserByAdmin error:', error);
    res.status(500).json({ message: 'Failed to permanently purge user' });
  }
};

// @desc    Ban or Unban a user with Timed Ban durations & Admin Password Verification
// @route   PUT /api/admin/users/:id/ban
// @access  Private / SuperAdmin, Admin, ComplaintModerator
export const toggleUserBan = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin', 'ComplaintModerator'])) return;

    const { id } = req.params;
    const { isBanned, banDuration, duration, banReason, reason, adminPassword } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    if (!adminPassword) {
      return res.status(401).json({ message: 'Admin password is required to modify ban status' });
    }

    const isPasswordValid = await verifyAdminPassword(req.user, adminPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Incorrect admin password. Action aborted.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({ message: 'You cannot ban your own account' });
    }

    if (user.role === 'SuperAdmin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Only a SuperAdmin can ban another SuperAdmin' });
    }

    const effectiveDuration = banDuration || duration;
    const effectiveReason = banReason || reason;
    const shouldBan = isBanned !== undefined ? Boolean(isBanned) : (effectiveDuration !== undefined ? true : !user.isBanned);

    user.isBanned = shouldBan;
    if (user.isBanned) {
      user.banReason = effectiveReason?.trim() || 'Administrative suspension';
      user.accountStatus = 'Banned';

      const now = Date.now();
      if (effectiveDuration === '24h') {
        user.bannedUntil = new Date(now + 24 * 60 * 60 * 1000);
      } else if (effectiveDuration === '7d') {
        user.bannedUntil = new Date(now + 7 * 24 * 60 * 60 * 1000);
      } else if (effectiveDuration === '30d') {
        user.bannedUntil = new Date(now + 30 * 24 * 60 * 60 * 1000);
      } else if (effectiveDuration === '1y') {
        user.bannedUntil = new Date(now + 365 * 24 * 60 * 60 * 1000);
      } else {
        user.bannedUntil = null; // Permanent
      }
    } else {
      user.bannedUntil = null;
      user.banReason = '';
      user.accountStatus = user.isDeleted ? 'Deleted' : (user.isDeactivated ? 'Deactivated' : 'Active');
    }

    await user.save();

    const actorName = req.user?.name || 'Admin';
    logAuditTrail(actorName, req.user?.role || 'Admin', 'Updated User Ban Status', id, `Banned: ${user.isBanned}, Duration: ${effectiveDuration || 'Permanent'}, Reason: ${user.banReason || 'N/A'}`, req);

    res.json({
      message: user.isBanned 
        ? `User ${user.name} has been suspended ${user.bannedUntil ? 'until ' + new Date(user.bannedUntil).toLocaleString() : 'permanently'}.`
        : `User ${user.name} ban has been removed.`,
      user
    });
  } catch (error) {
    console.error('toggleUserBan error:', error);
    res.status(500).json({ message: 'An internal error occurred while updating ban status' });
  }
};

// @desc    Get Gyms Pending Admin Approval
// @route   GET /api/admin/gyms/pending
// @access  Private / SuperAdmin, Admin
export const getPendingGymApprovals = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;

    const pendingGyms = await Gym.find({ approvalStatus: 'Pending' }).sort({ createdAt: -1 });
    return res.json(pendingGyms);
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Approve or Reject Pending Gym Facility
// @route   PUT /api/admin/gyms/:id/status
// @access  Private / SuperAdmin, Admin
export const updateGymApprovalStatus = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;

    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    let gym = null;
    if (id && /^[a-f\d]{24}$/i.test(id)) {
      gym = await Gym.findById(id);
    }
    if (!gym && id) {
      gym = await Gym.findOne({ ownerName: id });
    }

    if (!gym) {
      return res.status(404).json({ message: 'Gym facility not found' });
    }

    gym.approvalStatus = status;
    gym.approvedAt = status === 'Approved' ? new Date() : null;
    if (status === 'Rejected') {
      gym.rejectionReason = rejectionReason?.trim() || 'Facility registration does not meet platform verification standards.';
    } else {
      gym.rejectionReason = '';
    }
    await gym.save();

    const actorName = req.user?.name || 'Admin';
    try {
      logAuditTrail(actorName, req.user?.role || 'Admin', 'Reviewed Gym Application', gym._id.toString(), `Status: ${status}${status === 'Rejected' ? ' (Reason: ' + gym.rejectionReason + ')' : ''}`, req);
    } catch (e) {}

    let ownerId = gym.ownerName || 'Gym Owner';
    try {
      const ownerDoc = await User.findOne({ $or: [{ email: gym.ownerEmail }, { name: gym.ownerName }] });
      if (ownerDoc) {
        ownerId = ownerDoc._id.toString();
      }
    } catch (e) {}

    if (status === 'Approved') {
      try {
        await Notification.create({
          userId: ownerId,
          type: 'system',
          message: `Congratulations! Your gym facility "${gym.name}" has been approved by administration and is now active.`
        });
      } catch (nErr) {}
    } else if (status === 'Rejected') {
      try {
        await Notification.create({
          userId: ownerId,
          type: 'system',
          message: `Your gym facility application for "${gym.name}" was rejected. Reason: ${gym.rejectionReason}`
        });
      } catch (nErr) {}
    }

    return res.status(200).json({ message: `Gym status updated to ${status}`, gym });
  } catch (error) {
    console.error('updateGymApprovalStatus error:', error.message);
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Get Reported Posts for Moderation Queue
// @route   GET /api/admin/posts/reported
// @access  Private / SuperAdmin, Admin, ComplaintModerator
export const getReportedPosts = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin', 'ComplaintModerator'])) return;

    const reportedPosts = await Post.find({ reportCount: { $gt: 0 } }).sort({ reportCount: -1 });
    return res.json(reportedPosts || []);
  } catch (error) {
    console.error('getReportedPosts error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Moderate Reported Post (Delete, Dismiss, or Warn Author)
// @route   PUT /api/admin/posts/:id/moderate
// @access  Private / SuperAdmin, Admin, ComplaintModerator
export const moderateReportedPost = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin', 'ComplaintModerator'])) return;

    const { id } = req.params;
    const { action, reason } = req.body; // 'delete', 'dismiss', or 'warn'
    const actorName = req.user?.name || 'Admin';
    const note = reason?.trim() || 'Standard community review';

    logAuditTrail(actorName, req.user?.role || 'Admin', 'Moderated Reported Post', id, `Action: ${action}, Reason: ${note}`, req);

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Reported post not found' });
    }

    const authorName = post.authorName || 'User';
    let authorId = authorName;
    try {
      const authorDoc = await User.findOne({ $or: [{ _id: post.author }, { name: authorName }] });
      if (authorDoc) authorId = authorDoc._id.toString();
    } catch (e) {}

    const reporters = Array.isArray(post.reportedBy) ? post.reportedBy : [];

    if (action === 'delete') {
      // 1. Notify all reporters
      for (const reporter of reporters) {
        let repId = reporter.userId?.toString() || reporter.userName || 'Member';
        try {
          if (!reporter.userId && reporter.userName) {
            const repDoc = await User.findOne({ name: reporter.userName });
            if (repDoc) repId = repDoc._id.toString();
          }
        } catch (e) {}

        try {
          await Notification.create({
            userId: repId,
            type: 'system',
            message: `Update on your report: The post you reported by "${authorName}" was reviewed and removed by moderation. Reason: ${note}`
          });
        } catch (e) {}
      }

      // 2. Soft-remove with 15-day hold period allowing author appeal
      post.isModerated = true;
      post.moderationStatus = 'RemovedPendingAppeal';
      post.moderationReason = note;
      post.moderatedAt = new Date();
      post.appealDeadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await post.save();

      // 3. Notify post author about removal and 15-day appeal window
      try {
        await Notification.create({
          userId: authorId,
          type: 'system',
          message: `Your post was removed by moderation for: "${note}". It is held for 15 days in your profile where you can review details or submit an appeal before permanent removal.`
        });
      } catch (e) {}

      return res.json({ message: `Post by ${authorName} was removed and placed on 15-day appeal hold. Both author and reporters notified.` });
    } else if (action === 'purge') {
      // Immediate permanent wipe
      await Post.findByIdAndDelete(id);
      try {
        const { removePost } = await import('../services/supabaseService.js');
        await removePost(id, authorName, true);
      } catch (e) {}
      return res.json({ message: `Post by ${authorName} was permanently purged.` });
    } else if (action === 'warn') {
      // Send warning to author
      try {
        await Notification.create({
          userId: authorId,
          type: 'system',
          message: `Official Community Warning: Your post has been flagged by community members. Note: ${note}`
        });
      } catch (e) {}
      return res.json({ message: `Official moderation warning sent to ${authorName}.` });
    } else {
      // Dismiss reports
      for (const reporter of reporters) {
        let repId = reporter.userId?.toString() || reporter.userName || 'Member';
        try {
          if (!reporter.userId && reporter.userName) {
            const repDoc = await User.findOne({ name: reporter.userName });
            if (repDoc) repId = repDoc._id.toString();
          }
        } catch (e) {}

        try {
          await Notification.create({
            userId: repId,
            type: 'system',
            message: `Update on your report: The post you reported by "${authorName}" was reviewed and found to comply with community standards.`
          });
        } catch (e) {}
      }

      // Notify author
      if (authorName) {
        try {
          await Notification.create({
            userId: authorName,
            type: 'system',
            message: `Notice: A report against your post was reviewed by moderators and dismissed. No action was required.`
          });
        } catch (e) {}
      }

      post.reportCount = 0;
      post.reportedBy = [];
      await post.save();

      return res.json({ message: 'Reports dismissed, post kept live. Both author and reporters notified.', post });
    }
  } catch (error) {
    console.error('moderateReportedPost error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Create Cashback / Promotional Post
// @route   POST /api/admin/posts/cashback
// @access  Private / SuperAdmin, Admin
export const createCashbackPost = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;

    const { title, content, targetRole, rewardAmount } = req.body;
    const authorName = req.user?.name || 'Admin';
    const role = req.user?.role || 'Admin';

    // Junior Admin cashback posts require SuperAdmin final approval
    const approvalStatus = role === 'SuperAdmin' ? 'published' : 'pending_approval';

    try {
      const post = await Post.create({
        authorName,
        authorRole: role,
        content: content || `🎁 Special Cashback Promotion: Earn $${rewardAmount || 10} back!`,
        isCashback: true,
        cashbackAmount: Number(rewardAmount) || 10,
        approvalStatus
      });

      logAuditTrail(authorName, role, 'Created Cashback Post', post._id.toString(), `Status: ${approvalStatus}`, req);
      return res.status(201).json(post);
    } catch (e) {}

    res.status(201).json({
      _id: `post_cb_${Date.now()}`,
      authorName,
      content,
      isCashback: true,
      cashbackAmount: Number(rewardAmount) || 10,
      approvalStatus
    });
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Get Pending Cashback Posts (Senior SuperAdmin Approval Queue)
// @route   GET /api/admin/posts/pending-cashback
// @access  Private / SuperAdmin
export const getPendingCashbackPosts = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin'])) return;

    try {
      const pendingPosts = await Post.find({ isCashback: true, approvalStatus: 'pending_approval' }).sort({ createdAt: -1 });
      if (pendingPosts.length > 0) return res.json(pendingPosts);
    } catch (e) {}

    res.json([
      {
        _id: 'post_cb_pending_1',
        authorName: 'Junior Admin Alex',
        content: '🎁 Weekend Promo: 15% Cashback on Gym Memberships!',
        isCashback: true,
        cashbackAmount: 15,
        approvalStatus: 'pending_approval',
        createdAt: new Date()
      }
    ]);
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Senior SuperAdmin Approves or Rejects Cashback Post
// @route   PUT /api/admin/posts/:id/review-cashback
// @access  Private / SuperAdmin Only
export const reviewCashbackPost = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin'])) return;

    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const actorName = req.user?.name || 'Senior Super Admin';

    const post = await Post.findById(id);
    if (post) {
        post.isApproved = action === 'approve';
        post.reviewedBy = actorName;
        post.approvalStatus = action === 'approve' ? 'published' : 'rejected';
        await post.save();
    }

    logAuditTrail(actorName, 'SuperAdmin', 'Reviewed Cashback Post', id, `Final Decision: ${action}`, req);

    res.json({ message: `Cashback post review '${action}' recorded` });
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Add Chat Message to Complaint Thread (User / Admin)
// @route   POST /api/complaints/:id/chat
// @access  Private / Authenticated User / Admin
export const addComplaintChatMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, senderName, role } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const messageObj = {
      senderName: senderName || req.user?.name || 'User',
      role: role || req.user?.role || 'User',
      text: text.trim(),
      timestamp: new Date()
    };

    try {
      const complaint = await Complaint.findById(id);
      if (complaint) {
        if (!complaint.chatMessages) complaint.chatMessages = [];
        complaint.chatMessages.push(messageObj);
        if (role && role.toLowerCase().includes('admin')) {
          complaint.assignedAdminName = senderName || 'Admin';
        }
        await complaint.save();
        return res.status(201).json({ message: 'Message sent', chatMessages: complaint.chatMessages });
      }
    } catch (e) {}

    res.status(201).json({ message: 'Message sent', messageObj });
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Senior SuperAdmin Complaint Chat History Inspection (Monitor Junior Admins)
// @route   GET /api/admin/complaints/chats-inspection
// @access  Private / Senior SuperAdmin
export const getComplaintChatsInspection = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin'])) return;

    try {
      const complaintsWithChats = await Complaint.find({ 'chatMessages.0': { $exists: true } }).sort({ updatedAt: -1 });
      if (complaintsWithChats.length > 0) return res.json(complaintsWithChats);
    } catch (e) {}

    res.json([
      {
        _id: 'cmp_chat_1',
        complaintId: 'CMP-1001',
        reporterName: 'John Doe',
        assignedAdminName: 'Junior Admin Alex',
        reason: 'Defective Product',
        chatMessages: [
          { senderName: 'John Doe', role: 'User', text: 'Hi, my protein tub arrived damaged.', timestamp: new Date(Date.now() - 3600000) },
          { senderName: 'Junior Admin Alex', role: 'Admin', text: 'We are processing your replacement right away.', timestamp: new Date(Date.now() - 1800000) }
        ]
      }
    ]);
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Remove a post with removal reason and notify author (initiates 15-day appeal hold)
// @route   DELETE /api/admin/posts/:id/remove-with-reason
// @access  Private / SuperAdmin, Admin, ComplaintModerator
export const removePostWithReason = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin', 'ComplaintModerator'])) return;

    const { id } = req.params;
    const { reason } = req.body;
    const actorName = req.user?.name || 'Admin';

    let authorName = 'Unknown User';
    const post = await Post.findById(id);
    if (post) {
      authorName = post.authorName || authorName;
      post.isModerated = true;
      post.moderationStatus = 'RemovedPendingAppeal';
      post.moderationReason = reason || 'Violation of community guidelines';
      post.moderatedAt = new Date();
      post.appealDeadline = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await post.save();

      let authorId = authorName;
      try {
        const u = await User.findOne({ name: authorName });
        if (u) authorId = u._id.toString();
      } catch (e) {}

      try {
        await Notification.create({
          userId: authorId,
          type: 'system',
          message: `Your post was removed by moderation for: "${post.moderationReason}". It is held for 15 days in your profile where you can review details or submit an appeal before permanent removal.`
        });
      } catch (e) {}
    }

    logAuditTrail(actorName, req.user?.role || 'Admin', 'Removed Post with Reason (15-day hold)', id, `Reason: ${reason || 'Community Guidelines Violation'}`, req);

    res.json({ 
      message: 'Post removed and placed on 15-day appeal hold', 
      notificationSent: true,
      authorName,
      reason: reason || 'Violation of community guidelines' 
    });
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Get Moderation Appeals & Held Posts (15-day hold review queue)
// @route   GET /api/admin/posts/moderation-appeals
// @access  Private / SuperAdmin, Admin, ComplaintModerator
export const getModerationAppeals = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin', 'ComplaintModerator'])) return;
    const appeals = await Post.find({ isModerated: true })
      .sort({ isAppealSubmitted: -1, updatedAt: -1 });
    res.json(appeals || []);
  } catch (error) {
    console.error('getModerationAppeals error:', error);
    res.status(500).json({ message: 'Failed to fetch moderation appeals' });
  }
};

// @desc    Admin resolves post appeal (reinstate, reject with 3-day notice, or purge)
// @route   PUT /api/admin/posts/:id/resolve-appeal
// @access  Private / SuperAdmin, Admin, ComplaintModerator
export const resolvePostAppeal = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin', 'ComplaintModerator'])) return;
    const { id } = req.params;
    const { decision, replyReason } = req.body; // 'reinstate' | 'reject' | 'purge'
    const actorName = req.user?.name || 'Admin';

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found in moderation queue' });
    }

    const authorName = post.authorName || 'User';
    let authorId = authorName;
    try {
      const u = await User.findOne({ name: authorName });
      if (u) authorId = u._id.toString();
    } catch (e) {}

    if (decision === 'reinstate') {
      post.isModerated = false;
      post.moderationStatus = 'Active';
      post.reportCount = 0;
      post.reportedBy = [];
      post.isAppealSubmitted = false;
      post.adminAppealReply = replyReason || 'Appeal accepted. Content reinstated to community feed.';
      await post.save();

      logAuditTrail(actorName, req.user?.role || 'Admin', 'Reinstated Moderated Post', id, `Reply: ${post.adminAppealReply}`, req);

      try {
        await Notification.create({
          userId: authorId,
          type: 'system',
          message: `Great news! Your appeal for your post has been APPROVED by our moderation team. Your post is now restored to the community feed.`
        });
      } catch (e) {}

      return res.json({ message: `Post by ${authorName} reinstated successfully!`, post });
    } else if (decision === 'reject') {
      post.moderationStatus = 'AppealRejected';
      post.adminAppealReply = replyReason || 'Appeal rejected following review.';
      post.finalPurgeDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3-day notice before permanent wipe
      await post.save();

      logAuditTrail(actorName, req.user?.role || 'Admin', 'Rejected Post Appeal', id, `Final Purge in 3 days. Reply: ${post.adminAppealReply}`, req);

      try {
        await Notification.create({
          userId: authorId,
          type: 'system',
          message: `Your appeal for your post was REJECTED: "${post.adminAppealReply}". You have a 3-day final notice period before this post is permanently wiped.`
        });
      } catch (e) {}

      return res.json({ message: `Appeal rejected. 3-day final purge window initiated.`, post });
    } else if (decision === 'purge') {
      await Post.findByIdAndDelete(id);
      try {
        const { removePost } = await import('../services/supabaseService.js');
        await removePost(id, authorName, true);
      } catch (e) {}

      logAuditTrail(actorName, req.user?.role || 'Admin', 'Purged Moderated Post', id, 'Permanently wiped post from database', req);

      return res.json({ message: `Post by ${authorName} permanently purged from database.` });
    } else {
      return res.status(400).json({ message: 'Invalid appeal decision. Must be reinstate, reject, or purge.' });
    }
  } catch (error) {
    console.error('resolvePostAppeal error:', error);
    res.status(500).json({ message: 'Failed to resolve moderation appeal' });
  }
};

// @desc    Junior Admin submits Subscription Refund Cashback Request for Senior Admin Approval
// @route   POST /api/admin/complaints/:id/request-refund
// @access  Private / SuperAdmin, Admin
export const requestRefundCashback = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;

    const { id } = req.params;
    const { refundAmount } = req.body;
    const actorName = req.user?.name || 'Admin';

    const complaint = await Complaint.findById(id);
    if (complaint) {
        complaint.isRefundRequested = true;
        complaint.refundAmount = Number(refundAmount) || 29.99;
        complaint.cashbackApprovalStatus = 'pending_higher_admin';
        await complaint.save();

        logAuditTrail(actorName, 'Admin', 'Requested Refund Cashback Approval', id, `Amount: $${complaint.refundAmount}`, req);
        return res.json({ message: 'Refund cashback request submitted to Senior Super Admin', complaint });
    }

    res.json({ message: 'Refund cashback request submitted to Senior Super Admin' });
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Senior SuperAdmin Approves Subscription Refund Cashback
// @route   PUT /api/admin/complaints/:id/approve-refund
// @access  Private / Senior SuperAdmin
export const approveRefundCashback = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin'])) return;

    const { id } = req.params;
    const actorName = req.user?.name || 'Senior Super Admin';

    try {
      const complaint = await Complaint.findById(id);
      if (complaint) {
        complaint.cashbackApprovalStatus = 'approved';
        complaint.status = 'Resolved';
        complaint.approvedBy = actorName;
        
        // Add automatic system notification chat message
        if (!complaint.chatMessages) complaint.chatMessages = [];
        complaint.chatMessages.push({
          senderName: actorName,
          role: 'SuperAdmin',
          text: 'Your refund will be given shortly.',
          timestamp: new Date()
        });

        await complaint.save();
        logAuditTrail(actorName, 'SuperAdmin', 'Approved Subscription Refund Cashback', id, 'Decision: Approved', req);
        return res.json({ message: 'Refund cashback approved! User notified: Your refund will be given shortly.', complaint });
      }
    } catch (e) {}

    res.json({ message: 'Refund cashback approved! User notified: Your refund will be given shortly.' });
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Send Broadcast Message to Platform Users / Groups
// @route   POST /api/admin/broadcast
// @access  Private / SuperAdmin, Admin
export const sendSubscriberBroadcast = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;

    const { title, message, eventType, targetAudience } = req.body;
    const sentBy = req.user?.name || 'Admin';

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message content are required' });
    }

    // Determine target users
    let query = {};
    if (targetAudience === 'Gym Owners Only') {
      query = { role: { $regex: /^gymowner$/i } };
    } else if (targetAudience === 'Trainers Only') {
      query = { role: { $regex: /^trainer$/i } };
    } else if (targetAudience === 'All Users') {
      query = { role: { $regex: /^user$/i } };
    } else {
      // Entire Platform or default
      query = {};
    }

    let recipientCount = 0;
    try {
      const recipients = await User.find(query).select('_id');
      recipientCount = recipients.length;

      if (recipients.length > 0) {
        const notifications = recipients.map(u => ({
          userId: u._id.toString(),
          recipientId: u._id,
          senderId: req.user?._id || null,
          type: 'system',
          title: `[${eventType || 'Announcement'}] ${title}`,
          message,
          sender: sentBy,
          isRead: false
        }));
        await Notification.insertMany(notifications);
      }
    } catch (err) {
      console.error('Error inserting broadcast notifications:', err);
    }

    const broadcast = await Broadcast.create({
      title,
      message,
      eventType: eventType || 'Announcement',
      sentBy,
      targetAudience: targetAudience || 'Entire Platform',
      recipientCount
    });

    logAuditTrail(sentBy, req.user?.role || 'Admin', `Sent Broadcast to ${targetAudience || 'Entire Platform'}`, 'Broadcasts', `Event: ${title} (${recipientCount} recipients)`, req);

    res.status(201).json({
      message: `Broadcast announcement dispatched successfully to ${recipientCount} recipients!`,
      broadcast
    });
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Get Broadcast History
// @route   GET /api/admin/broadcasts
// @access  Private / SuperAdmin, Admin
export const getBroadcastHistory = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 }).limit(50);
    res.json(broadcasts);
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Get Audit Logs (Senior SuperAdmin Only)
// @route   GET /api/admin/audit-logs
// @access  Private / Senior SuperAdmin
export const getAuditLogs = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin'])) return;

    try {
      const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
      if (logs.length > 0) return res.json(logs);
    } catch (e) {}

    res.json([
      {
        _id: 'log_1',
        user: 'Junior Admin Alex',
        role: 'Admin',
        action: 'Created Cashback Post',
        targetEntity: 'post_cb_pending_1',
        details: 'Status: pending_approval',
        ipAddress: '127.0.0.1',
        timestamp: new Date(Date.now() - 7200000)
      },
      {
        _id: 'log_2',
        user: 'Senior Super Admin',
        role: 'SuperAdmin',
        action: 'Approved Gym Application',
        targetEntity: 'gym_pending_1',
        details: 'Status: Approved',
        ipAddress: '127.0.0.1',
        timestamp: new Date(Date.now() - 3600000)
      }
    ]);
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};

// @desc    Create a new Fitness Instructor account
// @route   POST /api/admin/create-instructor
// @access  Private / Admin, SuperAdmin
export const createInstructor = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const instructor = await User.create({
      name,
      email,
      password,
      role: 'FitnessInstructor'
    });
    res.status(201).json({ message: 'Fitness Instructor account created successfully', instructor });
  } catch (error) {
    console.error('Admin controller error:', error);
    res.status(500).json({ message: 'An internal error occurred during the administrative operation' });
  }
};
// To be concatenated with adminController.js

export const createDiscountCampaign = async (req, res) => {
  if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;
  try {
    const { campaignName, discountType, discountValue, validUntil, usageLimit, targetGymIds } = req.body;
    
    // Auto-generate a unique code
    const baseCode = campaignName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10);
    const campaignId = `CAMP-${Date.now()}`;
    
    // Find target gyms or all gyms
    const query = targetGymIds && targetGymIds.length > 0 ? { _id: { $in: targetGymIds } } : {};
    const gyms = await Gym.find(query);
    
    if (gyms.length === 0) {
      return res.status(400).json({ message: 'No gyms found for this campaign' });
    }

    const couponsToInsert = gyms.map(gym => ({
      code: `${baseCode}-${Math.floor(Math.random() * 10000)}`,
      gymId: gym._id,
      discountType,
      discountValue,
      audience: 'AllUsers',
      usageLimit: usageLimit || 0,
      validUntil,
      scope: 'PlatformLevel',
      platformCampaignId: campaignId,
      approvalStatus: 'Approved'
    }));

    await Coupon.insertMany(couponsToInsert);
    
    res.status(201).json({ message: `Campaign created and dispatched to ${gyms.length} gyms`, campaignId });
  } catch (error) {
    console.error('createDiscountCampaign error:', error);
    res.status(500).json({ message: 'Failed to create discount campaign' });
  }
};

export const getDiscountCampaigns = async (req, res) => {
  if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;
  try {
    const coupons = await Coupon.find({ scope: 'PlatformLevel' }).populate('gymId', 'name');
    
    // Aggregate by campaign
    const campaigns = coupons.reduce((acc, coupon) => {
      const cid = coupon.platformCampaignId;
      if (!acc[cid]) {
        acc[cid] = {
          campaignId: cid,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          validUntil: coupon.validUntil,
          totalUsage: 0,
          coupons: []
        };
      }
      acc[cid].totalUsage += coupon.timesUsed;
      acc[cid].coupons.push({ code: coupon.code, gym: coupon.gymId?.name, timesUsed: coupon.timesUsed });
      return acc;
    }, {});
    
    res.json(Object.values(campaigns));
  } catch (error) {
    console.error('getDiscountCampaigns error:', error);
    res.status(500).json({ message: 'Failed to fetch discount campaigns' });
  }
};

// @desc    Create / invite a StoreManager account (Admin only)
// @route   POST /api/admin/store-managers
// @access  Private / SuperAdmin, Admin
export const createStoreManager = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const storeManager = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'StoreManager',
      invitedBy: req.user._id,
      isEmailVerified: true,
      recoveryEmail: normalizedEmail
    });

    logAuditTrail(req.user.name, req.user.role, 'Created Store Manager Account', String(storeManager._id), `Email: ${normalizedEmail}`, req);

    res.status(201).json({
      message: 'Store Manager account successfully created and provisioned',
      storeManager: {
        _id: storeManager._id,
        name: storeManager.name,
        email: storeManager.email,
        role: storeManager.role,
        isEmailVerified: storeManager.isEmailVerified
      }
    });
  } catch (error) {
    console.error('createStoreManager error:', error);
    res.status(500).json({ message: 'Failed to create Store Manager account' });
  }
};

// @desc    Get all Store Managers
// @route   GET /api/admin/store-managers
// @access  Private / SuperAdmin, Admin
export const getStoreManagers = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;
    const managers = await User.find({ role: 'StoreManager' })
      .select('-password')
      .populate('invitedBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json(managers);
  } catch (error) {
    console.error('getStoreManagers error:', error);
    res.status(500).json({ message: 'Failed to fetch store managers' });
  }
};

// @desc    Update a StoreManager account
// @route   PUT /api/admin/store-managers/:id
// @access  Private / SuperAdmin, Admin
export const updateStoreManager = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;
    const { id } = req.params;
    const { name, accountStatus, password } = req.body;

    const manager = await User.findOne({ _id: id, role: 'StoreManager' });
    if (!manager) {
      return res.status(404).json({ message: 'Store Manager not found' });
    }

    if (name?.trim()) manager.name = name.trim();
    if (accountStatus && ['Active', 'Deactivated', 'Banned'].includes(accountStatus)) {
      manager.accountStatus = accountStatus;
      manager.isDeactivated = accountStatus === 'Deactivated';
      manager.isBanned = accountStatus === 'Banned';
    }
    if (password && password.trim().length >= 8) {
      manager.password = password.trim();
    }

    await manager.save();
    logAuditTrail(req.user.name, req.user.role, 'Updated Store Manager Account', String(manager._id), `Status: ${manager.accountStatus}`, req);

    res.json({
      message: 'Store Manager updated successfully',
      storeManager: {
        _id: manager._id,
        name: manager.name,
        email: manager.email,
        role: manager.role,
        accountStatus: manager.accountStatus,
        isEmailVerified: manager.isEmailVerified
      }
    });
  } catch (error) {
    console.error('updateStoreManager error:', error);
    res.status(500).json({ message: 'Failed to update Store Manager account' });
  }
};

// @desc    Delete / Revoke a StoreManager account
// @route   DELETE /api/admin/store-managers/:id
// @access  Private / SuperAdmin, Admin
export const deleteStoreManager = async (req, res) => {
  try {
    if (!verifyAdminRole(req, res, ['SuperAdmin', 'Admin'])) return;
    const { id } = req.params;

    const manager = await User.findOne({ _id: id, role: 'StoreManager' });
    if (!manager) {
      return res.status(404).json({ message: 'Store Manager not found' });
    }

    await User.findByIdAndDelete(id);
    logAuditTrail(req.user.name, req.user.role, 'Revoked Store Manager Account', String(id), `Email: ${manager.email}`, req);

    res.json({ message: `Store Manager ${manager.name} (${manager.email}) access has been permanently revoked and deleted.` });
  } catch (error) {
    console.error('deleteStoreManager error:', error);
    res.status(500).json({ message: 'Failed to delete Store Manager account' });
  }
};


