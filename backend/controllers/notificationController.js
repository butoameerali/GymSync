import Notification from '../models/Notification.js';

// @desc    Get user notifications
// @route   GET /api/notifications/:userId
// @access  Private
export const getNotifications = async (req, res) => {
  const paramUserId = req.params.userId;
  const currentUserId = String(req.user?._id);
  const currentUserName = req.user?.name;
  const isAdmin = ['Admin', 'SuperAdmin'].includes(req.user?.role);

  if (!isAdmin && paramUserId !== currentUserId && paramUserId !== currentUserName) {
    return res.status(403).json({ message: 'Not authorized to view these notifications' });
  }

  try {
    const notifications = await Notification.find({
      $or: [
        { userId: currentUserId },
        { userId: currentUserName }
      ]
    }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a notification
// @route   POST /api/notifications
// @access  Private
export const createNotification = async (req, res) => {
  const { userId, type, message, link } = req.body;
  const targetId = userId || String(req.user?._id);

  try {
    const notification = new Notification({ userId: targetId, type, message, link });
    const saved = await notification.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/notifications/:userId/read
// @access  Private
export const markAsRead = async (req, res) => {
  const paramUserId = req.params.userId;
  const currentUserId = String(req.user?._id);
  const currentUserName = req.user?.name;
  const isAdmin = ['Admin', 'SuperAdmin'].includes(req.user?.role);

  if (!isAdmin && paramUserId !== currentUserId && paramUserId !== currentUserName) {
    return res.status(403).json({ message: 'Not authorized to modify these notifications' });
  }

  try {
    await Notification.updateMany({
      $or: [
        { userId: currentUserId },
        { userId: currentUserName }
      ]
    }, { isRead: true });
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
