import express from 'express';
import { getNotifications, createNotification, markAsRead } from '../controllers/notificationController.js';

const router = express.Router();

router.route('/')
  .post(createNotification);

router.route('/:userId')
  .get(getNotifications);

router.route('/:userId/read')
  .put(markAsRead);

export default router;
