import express from 'express';
import {
  getConversation,
  sendMessage,
  getConversations,
  getUnreadChatCount,
  markConversationRead
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/unread-count', getUnreadChatCount);
router.patch('/read/:contactName', markConversationRead);

router.route('/')
  .post(sendMessage);

router.route('/conversations')
  .get(getConversations);

router.route('/conversations/:userName')
  .get(getConversations);

router.route('/:user1/:user2')
  .get(getConversation);

export default router;
