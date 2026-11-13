import { reminderScheduler } from '../services/notifications/reminderScheduler.js';

/**
 * Cron trigger endpoint controller for automated reminders.
 * Secured by CRON_SECRET for Vercel Cron or external triggers.
 */
export const triggerRemindersCron = async (req, res) => {
  try {
    const providedSecret = req.headers['x-cron-secret'] || req.query.secret || req.headers.authorization?.replace('Bearer ', '');
    const expectedSecret = process.env.CRON_SECRET || 'gymsync-cron-secret';

    if (!providedSecret || providedSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing cron secret' });
    }

    const { forceSlot, targetUserId } = req.query;

    const report = await reminderScheduler.runAllReminders({
      forceSlot: forceSlot || null,
      targetUserId: targetUserId || null
    });

    res.status(200).json({
      success: true,
      message: 'Reminders processed successfully',
      report
    });
  } catch (err) {
    console.error('triggerRemindersCron Error:', err);
    res.status(500).json({ error: 'Failed to process reminders cron' });
  }
};

export default {
  triggerRemindersCron
};
