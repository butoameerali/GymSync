import Message from '../models/Message.js';

// @desc    Get conversation between two users
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
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all unique conversation contacts for a user
// @route   GET /api/chat/conversations/:userName
// @access  Private
export const getConversations = async (req, res) => {
  const { userName } = req.params;
  const currentUserName = req.user?.name;
  const isAdmin = ['Admin', 'SuperAdmin', 'ComplaintModerator'].includes(req.user?.role);

  if (!isAdmin && currentUserName !== userName) {
    return res.status(403).json({ message: 'Not authorized to view these conversations' });
  }

  try {
    const messages = await Message.find({
      $or: [{ sender: userName }, { receiver: userName }]
    }).sort({ createdAt: -1 });
    
    // get unique contacts
    const contacts = new Set();
    messages.forEach(msg => {
      if (msg.sender !== userName) contacts.add(msg.sender);
      if (msg.receiver !== userName) contacts.add(msg.receiver);
    });

    res.json(Array.from(contacts));
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
      text: text.trim()
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
