import Message from '../models/Message.js';
import { executeCoachPipeline } from './aiController.js';

const normalizeContact = (c) => {
  if (!c) return '';
  if (c.toLowerCase() === 'ai' || c === 'AI Trainer') return 'AI Trainer';
  if (c.toLowerCase() === 'gym' || c === 'Gym Support') return 'Gym Support';
  return c;
};

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
  const user1 = normalizeContact(req.params.user1);
  const user2 = normalizeContact(req.params.user2);
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
  const contactName = normalizeContact(req.params.contactName);
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

    // Calculate unread counts for all senders targeting paramUserName in a single aggregation query
    const unreadAgg = await Message.aggregate([
      { $match: { receiver: paramUserName, isRead: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]);
    const unreadMap = new Map((unreadAgg || []).map(u => [u._id, u.count]));

    const conversationMap = new Map();

    for (const msg of messages) {
      const contactName = msg.sender === paramUserName ? msg.receiver : msg.sender;
      if (!contactName) continue;

      if (!conversationMap.has(contactName)) {
        const unreadCount = unreadMap.get(contactName) || 0;

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

    // Ensure AI Trainer is permanently visible on the messages page
    if (!conversationMap.has('AI Trainer')) {
      conversationMap.set('AI Trainer', {
        id: 'AI Trainer',
        name: 'AI Trainer',
        role: 'AI Coach',
        lastMessage: 'Tap to start your adaptive training session.',
        lastMessageTime: new Date(),
        isRead: true,
        unreadCount: 0
      });
    }

    // Ensure Gym Support is permanently visible on the messages page
    if (!conversationMap.has('Gym Support')) {
      conversationMap.set('Gym Support', {
        id: 'Gym Support',
        name: 'Gym Support',
        role: 'Support Desk',
        lastMessage: 'Reach out to gym staff for any queries or help.',
        lastMessageTime: new Date(),
        isRead: true,
        unreadCount: 0
      });
    }

    const conversations = Array.from(conversationMap.values());
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message (Supports P2P, AI Coach persistence, and Gym Support)
// @route   POST /api/chat
// @access  Private
export const sendMessage = async (req, res) => {
  const { receiver, text, userContext = {}, currentPlan = null, currentWorkout = null } = req.body;
  const sender = req.user?.name;

  if (!receiver || !text?.trim()) {
    return res.status(400).json({ message: 'Receiver and text message are required' });
  }

  const rawText = text.trim();
  const normalizedReceiver = normalizeContact(receiver);
  const isAi = normalizedReceiver === 'AI Trainer';
  const isGymSupport = normalizedReceiver === 'Gym Support';

  try {
    if (isAi) {
      // 1. Save user's message in Message collection
      const userMessage = await Message.create({
        sender,
        receiver: 'AI Trainer',
        text: rawText,
        isRead: true
      });

      // 2. Load recent conversation history between user and AI Trainer
      const pastMessages = await Message.find({
        $or: [
          { sender, receiver: 'AI Trainer' },
          { sender: 'AI Trainer', receiver: sender }
        ]
      }).sort({ createdAt: 1 }).limit(12);

      const historyFormatted = pastMessages.map(m => ({
        role: m.sender === sender ? 'user' : 'assistant',
        content: m.text
      }));

      // 3. Generate Coach Response
      const mergedContext = {
        name: req.user?.name,
        email: req.user?.email,
        ...userContext
      };

      const aiResult = await executeCoachPipeline({
        message: rawText,
        userContext: mergedContext,
        history: historyFormatted,
        currentPlan,
        currentWorkout
      });

      // 4. Save AI's response to Message collection
      const aiMessage = await Message.create({
        sender: 'AI Trainer',
        receiver: sender,
        text: aiResult.content,
        isRead: false
      });

      return res.status(201).json({
        ...userMessage.toObject(),
        aiReply: aiMessage,
        content: aiResult.content,
        structuredAction: aiResult.structuredAction
      });
    }

    if (isGymSupport) {
      // 1. Save user inquiry
      const userMessage = await Message.create({
        sender,
        receiver: 'Gym Support',
        text: rawText,
        isRead: true
      });

      // 2. Save automated confirmation response
      const supportReply = await Message.create({
        sender: 'Gym Support',
        receiver: sender,
        text: "Thanks for reaching out! GymSync Support has received your message. Our staff will respond to your query shortly.",
        isRead: false
      });

      return res.status(201).json({
        ...userMessage.toObject(),
        supportReply
      });
    }

    // Standard peer-to-peer message
    const message = await Message.create({
      sender,
      receiver: normalizedReceiver,
      text: rawText,
      isRead: false
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  getUnreadChatCount,
  getConversation,
  markConversationRead,
  getConversations,
  sendMessage
};
