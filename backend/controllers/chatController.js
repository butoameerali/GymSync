import Message from '../models/Message.js';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import { executeCoachPipeline } from './aiController.js';
import { isValidObjectId } from '../utils/validation.js';

// 'AI Trainer' and 'Gym Support' are virtual system contacts — no User document exists
// for them. registerUser() blocks real accounts from claiming these names (see
// authController.js), so name-matching is safe ONLY for these two reserved identities.
const SYSTEM_CONTACTS = new Set(['AI Trainer', 'Gym Support']);

const normalizeContact = (c) => {
  if (!c) return '';
  if (c.toLowerCase() === 'ai' || c === 'AI Trainer') return 'AI Trainer';
  if (c.toLowerCase() === 'gym' || c === 'Gym Support') return 'Gym Support';
  return c;
};

// Resolves a chat participant (a name OR an ObjectId string) into a stable identity.
// Real users are matched by ObjectId going forward, so a user's conversation history
// survives being renamed by an admin. System contacts have no ObjectId and stay name-only.
const resolveParticipant = async (identifier) => {
  const normalized = normalizeContact(identifier);
  if (SYSTEM_CONTACTS.has(normalized)) {
    return { name: normalized, id: null, isSystem: true };
  }
  if (isValidObjectId(normalized)) {
    const u = await User.findById(normalized).select('name').lean();
    if (u) return { name: u.name, id: u._id, isSystem: false };
  }
  const u = await User.findOne({ name: normalized })
    .collation({ locale: 'en', strength: 2 })
    .select('name')
    .lean();
  return { name: u ? u.name : normalized, id: u ? u._id : null, isSystem: false };
};

// Match clause for messages sent FROM `from` TO `to`.
// Uses ObjectId matching whenever the participant resolved to a real user (rename-safe).
// Falls back to name matching only for system contacts, or legacy rows / unresolvable
// users where an id genuinely isn't available.
const oneWay = (from, to) => ({
  ...(from.id ? { senderId: from.id } : { sender: from.name }),
  ...(to.id ? { receiverId: to.id } : { receiver: to.name })
});

const isSameParticipant = (p, currentUserId, currentUserName) =>
  (p.id && currentUserId && String(p.id) === String(currentUserId)) || (!p.id && p.name === currentUserName);

// @desc    Get total unread messages/conversations count for current user
// @route   GET /api/chat/unread-count
// @access  Private
export const getUnreadChatCount = async (req, res) => {
  try {
    const currentUserId = req.user?._id;
    const currentUserName = req.user?.name;
    if (!currentUserId && !currentUserName) return res.json({ unreadCount: 0 });

    const match = {
      isRead: false,
      $or: [{ receiverId: currentUserId || null }, { receiverId: null, receiver: currentUserName }]
    };

    const unreadMessagesCount = await Message.countDocuments(match);
    const idConversations = await Message.distinct('senderId', { ...match, senderId: { $ne: null } });
    const legacyConversations = await Message.distinct('sender', { ...match, senderId: null });

    res.json({
      unreadCount: idConversations.length + legacyConversations.length,
      totalUnreadMessages: unreadMessagesCount
    });
  } catch (error) {
    console.error('getUnreadChatCount error:', error);
    res.status(500).json({ message: 'Failed to retrieve unread chat count' });
  }
};

// @desc    Get conversation between two users (and mark incoming messages as read)
// @route   GET /api/chat/:user1/:user2
// @access  Private
export const getConversation = async (req, res) => {
  const p1 = await resolveParticipant(req.params.user1);
  const p2 = await resolveParticipant(req.params.user2);
  const currentUserId = req.user?._id;
  const currentUserName = req.user?.name;
  const isAdmin = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(req.user?.role);

  const meIsP1 = isSameParticipant(p1, currentUserId, currentUserName);
  const meIsP2 = isSameParticipant(p2, currentUserId, currentUserName);

  if (!isAdmin && !meIsP1 && !meIsP2) {
    return res.status(403).json({ message: 'Not authorized to view this private conversation' });
  }

  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const before = req.query.before;

    const query = { $or: [oneWay(p1, p2), oneWay(p2, p1)] };

    if (before) {
      if (isValidObjectId(before)) {
        query._id = { $lt: before };
      } else if (!isNaN(new Date(before).getTime())) {
        query.createdAt = { $lt: new Date(before) };
      }
    }

    const rawMessages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = rawMessages.length > limit;
    const items = hasMore ? rawMessages.slice(0, limit) : rawMessages;
    items.reverse();

    // Auto-mark incoming messages to current user as read when opening conversation
    if (currentUserId || currentUserName) {
      const me = meIsP1 ? p1 : p2;
      const other = meIsP1 ? p2 : p1;
      Message.updateMany({ ...oneWay(other, me), isRead: false }, {
        isRead: true,
        readAt: new Date()
      }).catch(() => {});
    }

    if (req.query.paginated === 'true') {
      return res.json({
        messages: items,
        hasMore,
        nextCursor: hasMore && items.length > 0 ? items[0]._id : null
      });
    }

    return res.json(items);
  } catch (error) {
    console.error('getConversation error:', error);
    res.status(500).json({ message: 'Failed to retrieve conversation' });
  }
};

// @desc    Mark conversation with contact as read (with IDOR protection)
// @route   PATCH /api/chat/read/:contactName
// @access  Private
export const markConversationRead = async (req, res) => {
  const contact = await resolveParticipant(req.params.contactName);
  const currentUserId = req.user?._id;
  const currentUserName = req.user?.name;

  if (!currentUserId && !currentUserName) {
    return res.status(400).json({ message: 'Not authorized' });
  }
  if (!contact.name && !contact.id) {
    return res.status(400).json({ message: 'Contact name is required' });
  }

  try {
    const me = { id: currentUserId || null, name: currentUserName };
    await Message.updateMany({ ...oneWay(contact, me), isRead: false }, {
      isRead: true,
      readAt: new Date()
    });

    res.json({ message: `Messages from ${contact.name} marked as read` });
  } catch (error) {
    console.error('markConversationRead error:', error);
    res.status(500).json({ message: 'Failed to mark conversation as read' });
  }
};

// @desc    Get all unique conversations for a user with last message & unread count
// @route   GET /api/chat/conversations/:userName
// @access  Private
export const getConversations = async (req, res) => {
  const currentUserId = req.user?._id;
  const currentUserName = req.user?.name;
  const isAdmin = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(req.user?.role);

  const target = await resolveParticipant(req.params.userName || currentUserName);
  const isSelf = isSameParticipant(target, currentUserId, currentUserName);

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ message: 'Not authorized to view these conversations' });
  }

  try {
    const matchMine = target.id
      ? { $or: [{ senderId: target.id }, { receiverId: target.id }] }
      : { $or: [{ sender: target.name }, { receiver: target.name }] };

    const messages = await Message.find(matchMine).sort({ createdAt: -1 }).lean();

    const conversationMap = new Map();

    for (const msg of messages) {
      const iAmSender = target.id
        ? String(msg.senderId) === String(target.id)
        : msg.sender === target.name;

      const counterpartId = iAmSender ? msg.receiverId : msg.senderId;
      const counterpartName = iAmSender ? msg.receiver : msg.sender;
      const key = counterpartId ? String(counterpartId) : counterpartName;
      if (!key) continue;

      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          id: counterpartId ? String(counterpartId) : counterpartName,
          name: counterpartName,
          lastMessage: msg.text,
          lastMessageTime: msg.createdAt,
          isRead: iAmSender ? true : msg.isRead,
          unreadCount: 0
        });
      }
      if (!iAmSender && !msg.isRead) {
        conversationMap.get(key).unreadCount += 1;
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

    res.json(Array.from(conversationMap.values()));
  } catch (error) {
    console.error('getConversations error:', error);
    res.status(500).json({ message: 'Failed to fetch conversations' });
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
      const userMessage = await Message.create({
        sender,
        senderId: req.user?._id || null,
        receiver: 'AI Trainer',
        text: rawText,
        isRead: true
      });

      const pastMessages = await Message.find({
        $or: [
          { senderId: req.user?._id || null, receiver: 'AI Trainer' },
          { sender: 'AI Trainer', receiverId: req.user?._id || null }
        ]
      }).sort({ createdAt: 1 }).limit(12);

      const historyFormatted = pastMessages.map(m => ({
        role: m.sender === 'AI Trainer' ? 'assistant' : 'user',
        content: m.text
      }));

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

      const aiMessage = await Message.create({
        sender: 'AI Trainer',
        receiver: sender,
        receiverId: req.user?._id || null,
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
      const userMessage = await Message.create({
        sender,
        senderId: req.user?._id || null,
        receiver: 'Gym Support',
        text: rawText,
        isRead: true
      });

      const ticketQuery = req.user?._id
        ? { reporterId: req.user._id, reportedEntityType: 'User', status: { $in: ['Pending', 'InReview'] } }
        : { reporterName: sender, reportedEntityType: 'User', status: { $in: ['Pending', 'InReview'] } };
      let ticket = await Complaint.findOne(ticketQuery).sort({ createdAt: -1 });

      if (!ticket) {
        const ticketId = `TICKET-${Math.floor(100000 + Math.random() * 900000)}`;
        ticket = await Complaint.create({
          complaintId: ticketId,
          reporterName: sender,
          reporterId: req.user?._id || null,
          reportedEntityType: 'User',
          reportedEntityId: String(req.user?._id || sender),
          reportedEntityTitle: `Support Request from ${sender}`,
          reason: 'General Inquiry / Live Chat Support',
          description: rawText,
          status: 'Pending',
          chatMessages: [
            {
              senderName: sender,
              role: req.user?.role || 'User',
              text: rawText,
              timestamp: new Date()
            }
          ]
        });
      } else {
        ticket.chatMessages.push({
          senderName: sender,
          role: req.user?.role || 'User',
          text: rawText,
          timestamp: new Date()
        });
        await ticket.save();
      }

      const replyText = `Thanks for reaching out! Your inquiry has been logged as Support Ticket #${ticket.complaintId}. Our staff has been notified and will respond to you shortly.`;

      const supportReply = await Message.create({
        sender: 'Gym Support',
        receiver: sender,
        receiverId: req.user?._id || null,
        text: replyText,
        isRead: false
      });

      return res.status(201).json({
        ...userMessage.toObject(),
        supportReply,
        ticketId: ticket.complaintId
      });
    }

    // Standard peer-to-peer message — resolve the recipient's ObjectId so the
    // conversation stays intact even if either party is renamed later.
    const recipientUser = await User.findOne({ name: normalizedReceiver })
      .collation({ locale: 'en', strength: 2 })
      .select('_id');

    if (!recipientUser) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = await Message.create({
      sender,
      senderId: req.user?._id || null,
      receiver: normalizedReceiver,
      receiverId: recipientUser._id,
      text: rawText,
      isRead: false
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

export default {
  getUnreadChatCount,
  getConversation,
  markConversationRead,
  getConversations,
  sendMessage
};
