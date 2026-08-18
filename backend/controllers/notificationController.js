import Notification from '../models/Notification.js';

// @desc    Get unread notification count for current user
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = String(req.user?._id);
    const currentUserName = req.user?.name;

    const unreadCount = await Notification.countDocuments({
      $or: [
        { userId: currentUserId },
        { userId: currentUserName }
      ],
      isRead: false
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    const query = {
      $or: [
        { userId: currentUserId },
        { userId: currentUserName }
      ]
    };

    if (typeof isRead !== 'undefined') {
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
        $or: [{ userId: currentUserId }, { userId: currentUserName }],
        isRead: false
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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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

    if (!isAdmin && notification.userId !== currentUserId && notification.userId !== currentUserName) {
      return res.status(403).json({ message: 'Not authorized to modify this notification' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    await Notification.updateMany({
      $or: [
        { userId: currentUserId },
        { userId: currentUserName }
      ],
      isRead: false
    }, {
      isRead: true,
      readAt: new Date()
    });

    res.json({ message: 'All notifications marked as read', unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    if (!isAdmin && notification.userId !== currentUserId && notification.userId !== currentUserName) {
      return res.status(403).json({ message: 'Not authorized to delete this notification' });
    }

    await notification.deleteOne();

    const unreadCount = await Notification.countDocuments({
      $or: [{ userId: currentUserId }, { userId: currentUserName }],
      isRead: false
    });

    res.json({ message: 'Notification deleted', unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
