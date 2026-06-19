import Message from '../models/Message.js';

// @desc    Get conversation between two users
// @route   GET /api/chat/:user1/:user2
// @access  Public
export const getConversation = async (req, res) => {
  const { user1, user2 } = req.params;
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

// @desc    Send a message
// @route   POST /api/chat
// @access  Public
export const sendMessage = async (req, res) => {
  const { sender, receiver, text } = req.body;
  try {
    const message = await Message.create({
      sender,
      receiver,
      text
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
