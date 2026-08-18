import Message from '../models/Message.js';

// @desc    Get total unread messages/conversations count for current user
// @route   GET /api/chat/unread-count
// @access  Private
export const getUnreadChatCount = async (req, res) => {
  try {
    const currentUserName = req.user?.name;
    if (!currentUserName) return res.json({ unreadCount: 0 });

    const unreadMessagesCount = await Message.countDocuments({
      receiver: currentUserName,
      isRead: false
    });

    const unreadConversations = await Message.distinct('sender', {
      receiver: currentUserName,
      isRead: false
    });

    res.json({
      unreadCount: unreadConversations.length,
      totalUnreadMessages: unreadMessagesCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get conversation between two users (and mark incoming messages as read)
// @route   GET /api/chat/:user1/:user2
// @access  Private
export const getConversation = async (req, res) => {
  const { user1, user2 } = req.params;
  const currentUserName = req.user?.name;
  const isAdmin = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(req.user?.role);

  if (!isAdmin && currentUserName !== user1 && currentUserName !== user2) {
    return res.status(403).json({ message: 'Not authorized to view this private conversation' });
  }

  try {
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    }).sort({ createdAt: 1 });

    // Auto-mark incoming messages to current user as read when opening conversation
    if (currentUserName) {
      const otherUser = currentUserName === user1 ? user2 : user1;
      await Message.updateMany({
        sender: otherUser,
        receiver: currentUserName,
        isRead: false
      }, {
        isRead: true,
        readAt: new Date()
      });
    }

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark conversation with contact as read (with IDOR protection)
// @route   PATCH /api/chat/read/:contactName
// @access  Private
export const markConversationRead = async (req, res) => {
  const { contactName } = req.params;
  const currentUserName = req.user?.name;

  if (!currentUserName || !contactName) {
    return res.status(400).json({ message: 'Contact name is required' });
  }

  try {
    await Message.updateMany({
      sender: contactName,
      receiver: currentUserName,
      isRead: false
    }, {
      isRead: true,
      readAt: new Date()
    });

    res.json({ message: `Messages from ${contactName} marked as read` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all unique conversations for a user with last message & unread count
// @route   GET /api/chat/conversations/:userName
// @access  Private
export const getConversations = async (req, res) => {
  const paramUserName = req.params.userName || req.user?.name;
  const currentUserName = req.user?.name;
  const isAdmin = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(req.user?.role);

  if (!isAdmin && currentUserName !== paramUserName) {
    return res.status(403).json({ message: 'Not authorized to view these conversations' });
  }

  try {
    const messages = await Message.find({
      $or: [{ sender: paramUserName }, { receiver: paramUserName }]
    }).sort({ createdAt: -1 });

    const conversationMap = new Map();

    for (const msg of messages) {
      const contactName = msg.sender === paramUserName ? msg.receiver : msg.sender;
      if (!contactName) continue;

      if (!conversationMap.has(contactName)) {
        const unreadCount = await Message.countDocuments({
          sender: contactName,
          receiver: paramUserName,
          isRead: false
        });

        conversationMap.set(contactName, {
          id: contactName,
          name: contactName,
          lastMessage: msg.text,
          lastMessageTime: msg.createdAt,
          isRead: msg.sender === paramUserName ? true : msg.isRead,
          unreadCount
        });
      }
    }

    const conversations = Array.from(conversationMap.values());
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message
// @route   POST /api/chat
// @access  Private
export const sendMessage = async (req, res) => {
  const { receiver, text } = req.body;
  const sender = req.user?.name;

  if (!receiver || !text?.trim()) {
    return res.status(400).json({ message: 'Receiver and text message are required' });
  }

  try {
    const message = await Message.create({
      sender,
      receiver,
      text: text.trim(),
      isRead: false
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
