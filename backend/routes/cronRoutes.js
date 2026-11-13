import express from 'express';
import { triggerRemindersCron } from '../controllers/cronController.js';

const router = express.Router();

// Cron-triggered reminder execution endpoint (secured by secret)
router.get('/reminders', triggerRemindersCron);
router.post('/reminders', triggerRemindersCron);

export default router;
