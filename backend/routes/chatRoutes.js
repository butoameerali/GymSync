import express from 'express';
import { getConversation, sendMessage, getConversations } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(sendMessage);

router.route('/conversations/:userName')
  .get(getConversations);

router.route('/:user1/:user2')
  .get(getConversation);

export default router;
