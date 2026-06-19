import Notification from '../models/Notification.js';

// @desc    Get user notifications
// @route   GET /api/notifications/:userId
// @access  Public (for demo)
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a notification
// @route   POST /api/notifications
// @access  Public
export const createNotification = async (req, res) => {
  const { userId, type, message, link } = req.body;
  try {
    const notification = new Notification({ userId, type, message, link });
    const saved = await notification.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/notifications/:userId/read
// @access  Public
export const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId }, { isRead: true });
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
