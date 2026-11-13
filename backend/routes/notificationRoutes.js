import express from 'express';
import {
  getNotifications,
  createNotification,
  markAsRead,
  markSingleAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  getVapidPublicKeyController,
  subscribeWebPushController,
  unsubscribeWebPushController,
  getNotificationPreferencesController,
  updateNotificationPreferencesController,
  snoozeNotification,
  stopNotification
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public VAPID key retrieval
router.get('/vapid-public-key', getVapidPublicKeyController);

router.use(protect);

router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAsRead);
router.delete('/clear-all', deleteAllNotifications);

// Snooze and Stop Reminders
router.post('/item/:id/snooze', snoozeNotification);
router.post('/item/:id/stop', stopNotification);
router.post('/:id/snooze', snoozeNotification);
router.post('/:id/stop', stopNotification);

// Web Push and Preferences
router.post('/subscribe', subscribeWebPushController);
router.delete('/unsubscribe', unsubscribeWebPushController);
router.route('/preferences')
  .get(getNotificationPreferencesController)
  .put(updateNotificationPreferencesController);

router.route('/')
  .post(createNotification);

router.route('/item/:id/read')
  .patch(markSingleAsRead);

router.route('/item/:id')
  .delete(deleteNotification);

router.route('/:userId')
  .get(getNotifications);

router.route('/:userId/all')
  .delete(deleteAllNotifications);

router.route('/:userId/read')
  .put(markAsRead)
  .patch(markAsRead);

export default router;
