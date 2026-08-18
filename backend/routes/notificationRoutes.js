import express from 'express';
import {
  getNotifications,
  createNotification,
  markAsRead,
  markSingleAsRead,
  deleteNotification,
  getUnreadCount
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAsRead);

router.route('/')
  .post(createNotification);

router.route('/item/:id/read')
  .patch(markSingleAsRead);

router.route('/item/:id')
  .delete(deleteNotification);

router.route('/:userId')
  .get(getNotifications);

router.route('/:userId/read')
  .put(markAsRead)
  .patch(markAsRead);

export default router;
