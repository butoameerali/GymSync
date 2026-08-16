import express from 'express';
import { getNotifications, createNotification, markAsRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .post(createNotification);

router.route('/:userId')
  .get(getNotifications);

router.route('/:userId/read')
  .put(markAsRead);

export default router;
