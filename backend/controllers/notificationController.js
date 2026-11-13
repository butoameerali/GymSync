import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import UserWorkoutProgram from '../models/UserWorkoutProgram.js';
import PushSubscription from '../models/PushSubscription.js';
import { getVapidPublicKey } from '../services/notifications/webPushService.js';

// @desc    Get unread notification count for current user
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = String(req.user?._id);
    const currentUserName = req.user?.name;

    const orConditions = [
      { userId: currentUserId },
      { userId: currentUserName }
    ];
    if (mongoose.Types.ObjectId.isValid(currentUserId)) {
      orConditions.push({ recipientId: req.user._id });
    }

    const now = new Date();
    const unreadCount = await Notification.countDocuments({
      $and: [
        { $or: orConditions },
        {
          $or: [
            { snoozedUntil: null },
            { snoozedUntil: { $exists: false } },
            { snoozedUntil: { $lte: now } }
          ]
        }
      ],
      isRead: false,
      isDismissed: { $ne: true }
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    res.status(500).json({ message: 'Failed to retrieve unread notifications count' });
  }
};

// @desc    Get user notifications with filtering and pagination
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
    const { page = 1, limit = 20, isRead, type } = req.query;
    const orConditions = [
      { userId: currentUserId },
      { userId: currentUserName }
    ];
    if (mongoose.Types.ObjectId.isValid(currentUserId)) {
      orConditions.push({ recipientId: req.user._id });
    }
    if (paramUserId && (paramUserId === currentUserId || paramUserId === currentUserName || isAdmin)) {
      orConditions.push({ userId: paramUserId });
    }

    const now = new Date();
    const query = {
      $and: [
        { $or: orConditions },
        {
          $or: [
            { snoozedUntil: null },
            { snoozedUntil: { $exists: false } },
            { snoozedUntil: { $lte: now } }
          ]
        }
      ],
      isDismissed: { $ne: true }
    };

    if (typeof isRead !== 'undefined' && isRead !== '') {
      query.isRead = isRead === 'true';
    }
    if (type) {
      query.type = type;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({
        $and: [
          { $or: orConditions },
          {
            $or: [
              { snoozedUntil: null },
              { snoozedUntil: { $exists: false } },
              { snoozedUntil: { $lte: now } }
            ]
          }
        ],
        isRead: false,
        isDismissed: { $ne: true }
      })
    ]);

    res.json({
      notifications,
      total,
      unreadCount,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

// @desc    Create a notification
// @route   POST /api/notifications
// @access  Private
export const createNotification = async (req, res) => {
  const { userId, type, title, message, link, relatedId, eventKey } = req.body;
  const targetId = userId || String(req.user?._id);
  const authenticatedSender = req.user?.name || 'System';

  try {
    const notification = new Notification({
      userId: targetId,
      type,
      title: title || '',
      message,
      link: link || '',
      relatedId: relatedId || '',
      sender: authenticatedSender,
      eventKey: eventKey || undefined
    });
    const saved = await notification.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('createNotification error:', error);
    res.status(500).json({ message: 'Failed to create notification' });
  }
};

// @desc    Mark single notification as read (with IDOR protection)
// @route   PATCH /api/notifications/item/:id/read
// @access  Private
export const markSingleAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = String(req.user?._id);
    const currentUserName = req.user?.name;
    const isAdmin = ['Admin', 'SuperAdmin'].includes(req.user?.role);

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const isRecipient = notification.userId === currentUserId ||
      notification.userId === currentUserName ||
      (notification.recipientId && String(notification.recipientId) === currentUserId);

    if (!isAdmin && !isRecipient) {
      return res.status(403).json({ message: 'Not authorized to modify this notification' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error('markSingleAsRead error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

// @desc    Mark all user notifications as read
// @route   PUT /api/notifications/:userId/read or PATCH /api/notifications/read-all
// @access  Private
export const markAsRead = async (req, res) => {
  const paramUserId = req.params.userId;
  const currentUserId = String(req.user?._id);
  const currentUserName = req.user?.name;
  const isAdmin = ['Admin', 'SuperAdmin'].includes(req.user?.role);

  if (paramUserId && !isAdmin && paramUserId !== currentUserId && paramUserId !== currentUserName) {
    return res.status(403).json({ message: 'Not authorized to modify these notifications' });
  }

  try {
    const orConditions = [
      { userId: currentUserId },
      { userId: currentUserName }
    ];
    if (mongoose.Types.ObjectId.isValid(currentUserId)) {
      orConditions.push({ recipientId: req.user._id });
    }
    if (paramUserId && (paramUserId === currentUserId || paramUserId === currentUserName || isAdmin)) {
      orConditions.push({ userId: paramUserId });
    }

    await Notification.updateMany({
      $or: orConditions,
      isRead: false
    }, {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ message: 'All notifications marked as read', unreadCount: 0 });
  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
};

// @desc    Delete all notifications for current user
// @route   DELETE /api/notifications/clear-all
// @access  Private
export const deleteAllNotifications = async (req, res) => {
  const paramUserId = req.params.userId;
  const currentUserId = String(req.user?._id);
  const currentUserName = req.user?.name;
  const isAdmin = ['Admin', 'SuperAdmin'].includes(req.user?.role);

  if (paramUserId && !isAdmin && paramUserId !== currentUserId && paramUserId !== currentUserName) {
    return res.status(403).json({ message: 'Not authorized to delete these notifications' });
  }

  try {
    const orConditions = [
      { userId: currentUserId },
      { userId: currentUserName }
    ];
    if (mongoose.Types.ObjectId.isValid(currentUserId)) {
      orConditions.push({ recipientId: req.user._id });
    }
    if (paramUserId && (paramUserId === currentUserId || paramUserId === currentUserName || isAdmin)) {
      orConditions.push({ userId: paramUserId });
    }

    const result = await Notification.deleteMany({
      $or: orConditions
    });

    res.json({ message: 'All notifications cleared successfully', deletedCount: result.deletedCount, unreadCount: 0 });
  } catch (error) {
    console.error('deleteAllNotifications error:', error);
    res.status(500).json({ message: 'Failed to delete all notifications' });
  }
};

// @desc    Delete a single notification (with IDOR protection)
// @route   DELETE /api/notifications/item/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = String(req.user?._id);
    const currentUserName = req.user?.name;
    const isAdmin = ['Admin', 'SuperAdmin'].includes(req.user?.role);

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const isRecipient = notification.userId === currentUserId ||
      notification.userId === currentUserName ||
      (notification.recipientId && String(notification.recipientId) === currentUserId);

    if (!isAdmin && !isRecipient) {
      return res.status(403).json({ message: 'Not authorized to delete this notification' });
    }

    await notification.deleteOne();

    const orConditions = [
      { userId: currentUserId },
      { userId: currentUserName }
    ];
    if (mongoose.Types.ObjectId.isValid(currentUserId)) {
      orConditions.push({ recipientId: req.user._id });
    }

    const unreadCount = await Notification.countDocuments({
      $or: orConditions,
      isRead: false
    });

    res.json({ message: 'Notification deleted', unreadCount });
  } catch (error) {
    console.error('deleteNotification error:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
};

// @desc    Get VAPID public key for Web Push subscription
// @route   GET /api/notifications/vapid-public-key
// @access  Public or Private
export const getVapidPublicKeyController = (req, res) => {
  const publicKey = getVapidPublicKey();
  res.json({ publicKey });
};

// @desc    Register a Web Push subscription
// @route   POST /api/notifications/subscribe
// @access  Private
export const subscribeWebPushController = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid push subscription payload' });
    }

    const userId = req.user._id;
    const userAgent = req.headers['user-agent'] || '';

    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId,
        endpoint,
        keys,
        userAgent,
        createdAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Push subscription active', subscriptionId: subscription._id });
  } catch (err) {
    console.error('subscribeWebPushController error:', err);
    res.status(500).json({ error: 'Failed to register push subscription' });
  }
};

// @desc    Unsubscribe Web Push
// @route   DELETE /api/notifications/unsubscribe
// @access  Private
export const unsubscribeWebPushController = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, userId: req.user._id });
    } else {
      await PushSubscription.deleteMany({ userId: req.user._id });
    }
    res.json({ message: 'Push notifications unsubscribed successfully' });
  } catch (err) {
    console.error('unsubscribeWebPushController error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe push notifications' });
  }
};

// @desc    Get notification preferences (quiet hours, reminder times, mute)
// @route   GET /api/notifications/preferences
// @access  Private
export const getNotificationPreferencesController = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    res.json({
      preferences: user?.notificationPreferences || {
        muted: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        workoutReminderTime: '09:00',
        workoutRemindersEnabled: true,
        mealRemindersEnabled: true,
        progressRemindersEnabled: true
      }
    });
  } catch (err) {
    console.error('getNotificationPreferencesController error:', err);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
export const updateNotificationPreferencesController = async (req, res) => {
  try {
    const {
      muted,
      quietHoursStart,
      quietHoursEnd,
      workoutReminderTime,
      workoutRemindersEnabled,
      mealRemindersEnabled,
      progressRemindersEnabled
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.notificationPreferences) {
      user.notificationPreferences = {};
    }

    if (typeof muted !== 'undefined') user.notificationPreferences.muted = Boolean(muted);
    if (quietHoursStart) user.notificationPreferences.quietHoursStart = quietHoursStart;
    if (quietHoursEnd) user.notificationPreferences.quietHoursEnd = quietHoursEnd;
    if (workoutReminderTime) user.notificationPreferences.workoutReminderTime = workoutReminderTime;
    if (typeof workoutRemindersEnabled !== 'undefined') user.notificationPreferences.workoutRemindersEnabled = Boolean(workoutRemindersEnabled);
    if (typeof mealRemindersEnabled !== 'undefined') user.notificationPreferences.mealRemindersEnabled = Boolean(mealRemindersEnabled);
    if (typeof progressRemindersEnabled !== 'undefined') user.notificationPreferences.progressRemindersEnabled = Boolean(progressRemindersEnabled);

    await user.save();

    res.json({
      message: 'Notification preferences updated',
      preferences: user.notificationPreferences
    });
  } catch (err) {
    console.error('updateNotificationPreferencesController error:', err);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
};

// @desc    Snooze a notification (e.g., program review reminder) for 24 hours
// @route   POST /api/notifications/:id/snooze
// @access  Private
export const snoozeNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const hours = Number(req.body?.hours) || 24;
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.snoozedUntil = snoozedUntil;
    notification.isRead = true;
    await notification.save();

    // If related to a UserWorkoutProgram, update program snooze
    if (notification.relatedId && mongoose.Types.ObjectId.isValid(notification.relatedId)) {
      await UserWorkoutProgram.findByIdAndUpdate(notification.relatedId, {
        reviewSnoozedUntil: snoozedUntil
      });
    }

    res.json({
      message: `Notification snoozed for ${hours} hours`,
      snoozedUntil
    });
  } catch (err) {
    console.error('snoozeNotification error:', err);
    res.status(500).json({ error: 'Failed to snooze notification' });
  }
};

// @desc    Stop/dismiss notifications of this type (e.g., do not remind again for review)
// @route   POST /api/notifications/:id/stop
// @access  Private
export const stopNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.isDismissed = true;
    notification.isRead = true;
    await notification.save();

    // If related to a UserWorkoutProgram, disable future review reminders for it
    if (notification.relatedId && mongoose.Types.ObjectId.isValid(notification.relatedId)) {
      await UserWorkoutProgram.findByIdAndUpdate(notification.relatedId, {
        reviewRemindersDisabled: true
      });
    }

    res.json({
      message: 'Reminders stopped successfully'
    });
  } catch (err) {
    console.error('stopNotification error:', err);
    res.status(500).json({ error: 'Failed to stop reminders' });
  }
};


