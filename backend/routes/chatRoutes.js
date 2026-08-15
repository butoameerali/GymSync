import express from 'express';
import { getConversation, sendMessage, getConversations } from '../controllers/chatController.js';

const router = express.Router();

router.route('/')
  .post(sendMessage);

router.route('/conversations/:userName')
  .get(getConversations);

router.route('/:user1/:user2')
  .get(getConversation);

export default router;
