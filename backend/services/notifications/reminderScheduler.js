import Notification from '../../models/Notification.js';
import User from '../../models/User.js';
import UserWorkoutProgram from '../../models/UserWorkoutProgram.js';
import WeightLossEnrollment from '../../models/WeightLossEnrollment.js';
import { sendPushNotification } from './webPushService.js';

/**
 * Checks if current time falls within user's configured quiet hours or if notifications are muted.
 */
export function isQuietHours(preferences = {}, date = new Date()) {
  if (preferences?.muted) {
    return true;
  }

  const startStr = preferences?.quietHoursStart || '22:00';
  const endStr = preferences?.quietHoursEnd || '07:00';

  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  const curMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  if (startMinutes <= endMinutes) {
    // Normal window e.g. 13:00 to 15:00
    return curMinutes >= startMinutes && curMinutes < endMinutes;
  } else {
    // Overnight window e.g. 22:00 to 07:00
    return curMinutes >= startMinutes || curMinutes < endMinutes;
  }
}

/**
 * Creates notification with strict eventKey idempotency (at most one per user per slot per day).
 */
export async function createNotificationWithIdempotency({
  userId,
  recipientId = null,
  type,
  title,
  message,
  link,
  eventKey,
  preferences = null,
  date = new Date()
}) {
  const targetUserIdStr = String(userId);

  // 1. Idempotency check via eventKey
  if (eventKey) {
    const existing = await Notification.findOne({
      userId: targetUserIdStr,
      eventKey
    });
    if (existing) {
      return { created: false, notification: existing, reason: 'Already exists for this slot (idempotent)' };
    }
  }

  // 2. Create in-app notification
  const notification = await Notification.create({
    userId: targetUserIdStr,
    recipientId: recipientId || (userId.length === 24 ? userId : null),
    type,
    title,
    message,
    link,
    eventKey,
    sender: 'GymSync Reminder',
    isRead: false
  });

  // 3. Web Push dispatch if not in quiet hours and not muted
  const inQuietHours = isQuietHours(preferences, date);
  if (!inQuietHours && recipientId) {
    await sendPushNotification(recipientId, {
      title,
      body: message,
      link,
      type
    }).catch(err => console.warn('Push delivery notice:', err.message));
  }

  return { created: true, notification };
}

/**
 * Determine current meal slot by hour:
 * 08:00 - 10:59: breakfast
 * 12:00 - 14:59: lunch
 * 16:00 - 17:59: snack
 * 19:00 - 21:59: dinner
 */
export function getMealSlotForHour(hour) {
  if (hour >= 8 && hour < 11) return 'breakfast';
  if (hour >= 12 && hour < 15) return 'lunch';
  if (hour >= 16 && hour < 18) return 'snack';
  if (hour >= 19 && hour < 22) return 'dinner';
  return null;
}

/**
 * Computes ISO Week Number (1-53) for weekly progress reminder idempotency.
 */
export function getIsoWeekNumber(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

/**
 * Main Reminder Scheduler Engine
 * Generates rule-based reminders strictly independent of Ollama or AI (Rule R6).
 */
export const reminderScheduler = {
  /**
   * 1. Workout Reminders:
   * Sent to users with active programs for today's scheduled workout.
   */
  async generateWorkoutReminders({ date = new Date(), targetUserId = null } = {}) {
    const dateStr = date.toISOString().split('T')[0];
    const userQuery = targetUserId ? { _id: targetUserId } : {};

    // Find active programs
    const activePrograms = await UserWorkoutProgram.find({
      isActive: true,
      ...(targetUserId ? { userId: targetUserId } : {})
    }).populate('userId', 'name notificationPreferences');

    let createdCount = 0;

    for (const prog of activePrograms) {
      const user = prog.userId;
      if (!user) continue;

      const prefs = user.notificationPreferences || {};
      if (prefs.workoutRemindersEnabled === false) continue;

      const eventKey = `workout_rem_${user._id}_${dateStr}`;
      const title = "Time for Today's Workout!";
      const message = `Your session for "${prog.title}" is ready. Keep your momentum going!`;
      const link = '/ai-trainer?action=today_workout';

      const res = await createNotificationWithIdempotency({
        userId: user._id,
        recipientId: user._id,
        type: 'workout_reminder',
        title,
        message,
        link,
        eventKey,
        preferences: prefs,
        date
      });

      if (res.created) createdCount++;
    }

    return { type: 'workout_reminders', createdCount };
  },

  /**
   * 2. Meal-Report Reminders:
   * Sent during meal windows (breakfast/lunch/snack/dinner) to track food intake.
   * NOTE: Enforces Rule R2 — Track + report only, no system diet assignments.
   */
  async generateMealReminders({ date = new Date(), forceSlot = null, targetUserId = null } = {}) {
    const slot = forceSlot || getMealSlotForHour(date.getHours());
    if (!slot) {
      return { type: 'meal_reminders', createdCount: 0, reason: 'Current hour outside meal windows' };
    }

    const dateStr = date.toISOString().split('T')[0];
    const users = await User.find({
      role: 'User',
      ...(targetUserId ? { _id: targetUserId } : {})
    }).select('name notificationPreferences');

    const slotLabels = {
      breakfast: { title: 'Breakfast Nutrition Log', label: 'Breakfast', text: 'Log your morning breakfast to keep your daily energy on track.' },
      lunch: { title: 'Lunch Time Nutrition Check', label: 'Lunch', text: 'Track your lunch to monitor your calorie and macronutrient balance.' },
      snack: { title: 'Midday Snack Check-in', label: 'Snack', text: 'Keep your logs consistent by recording your afternoon snack.' },
      dinner: { title: 'Dinner Report & Wrap-up', label: 'Dinner', text: 'Complete today\'s nutrition picture by logging your dinner.' }
    };

    const slotMeta = slotLabels[slot] || slotLabels.lunch;
    let createdCount = 0;

    for (const user of users) {
      const prefs = user.notificationPreferences || {};
      if (prefs.mealRemindersEnabled === false) continue;

      const eventKey = `meal_rem_${slot}_${user._id}_${dateStr}`;
      const title = slotMeta.title;
      const message = slotMeta.text;
      const link = `/ai-trainer?tab=diets&action=log_meal&meal=${slot}`;

      const res = await createNotificationWithIdempotency({
        userId: user._id,
        recipientId: user._id,
        type: 'meal_reminder',
        title,
        message,
        link,
        eventKey,
        preferences: prefs,
        date
      });

      if (res.created) createdCount++;
    }

    return { type: 'meal_reminders', slot, createdCount };
  },

  /**
   * 3. Weekly Progress & Waist Reminders:
   * Sent weekly to participants of weight loss or general training programs.
   */
  async generateProgressReminders({ date = new Date(), targetUserId = null } = {}) {
    const year = date.getFullYear();
    const weekNum = getIsoWeekNumber(date);
    const weekKey = `${year}_W${weekNum}`;

    // Find active enrollments
    const activeEnrollments = await WeightLossEnrollment.find({
      isActive: true,
      ...(targetUserId ? { userId: targetUserId } : {})
    }).populate('userId', 'name notificationPreferences');

    let createdCount = 0;

    for (const enrollment of activeEnrollments) {
      const user = enrollment.userId;
      if (!user) continue;

      const prefs = user.notificationPreferences || {};
      if (prefs.progressRemindersEnabled === false) continue;

      const eventKey = `progress_rem_${user._id}_${weekKey}`;
      const title = 'Weekly Progress & Consistency Check-in';
      const message = 'Take a minute to review your weekly workouts or log an optional waist measurement.';
      const link = '/weight-loss';

      const res = await createNotificationWithIdempotency({
        userId: user._id,
        recipientId: user._id,
        type: 'progress_reminder',
        title,
        message,
        link,
        eventKey,
        preferences: prefs,
        date
      });

      if (res.created) createdCount++;
    }

    return { type: 'progress_reminders', createdCount };
  },

  /**
   * 4. Missed Workout Check-in:
   * Triggers ONLY when user missed a scheduled workout day.
   * Offers 2 clear choices: Cover on rest day OR extend program duration by 1 day.
   */
  async generateMissedWorkoutCheckin({ date = new Date(), targetUserId = null } = {}) {
    const dateStr = date.toISOString().split('T')[0];
    const activePrograms = await UserWorkoutProgram.find({
      isActive: true,
      ...(targetUserId ? { userId: targetUserId } : {})
    }).populate('userId', 'name notificationPreferences');

    let createdCount = 0;

    for (const prog of activePrograms) {
      const user = prog.userId;
      if (!user) continue;

      const prefs = user.notificationPreferences || {};
      if (prefs.workoutRemindersEnabled === false) continue;

      const completedSessions = prog.progress?.completedSessions || [];
      const totalSessionsCompleted = completedSessions.length;
      const start = new Date(prog.startDate || prog.createdAt || Date.now());
      const daysElapsed = Math.max(0, Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      if (daysElapsed > totalSessionsCompleted && daysElapsed > 0) {
        const eventKey = `missed_checkin_${user._id}_${prog._id}_${dateStr}`;
        const title = "Workout Missed — Catch Up on Rest Day?";
        const message = "Aapne workout session miss kiya tha. Kya aap rest day par yeh exercise cover karna chahte hain, ya program date 1 din extend karni hai?";
        const link = `/ai-trainer?action=missed_workout_prompt&programId=${prog._id}`;

        const res = await createNotificationWithIdempotency({
          userId: user._id,
          recipientId: user._id,
          type: 'workout_reminder',
          title,
          message,
          link,
          eventKey,
          preferences: prefs,
          date
        });

        if (res.created) createdCount++;
      }
    }

    return { type: 'missed_workout_checkins', createdCount };
  },

  /**
   * Combined Runner: Executes all due reminder tasks.
   */
  async runAllReminders({ date = new Date(), forceSlot = null, targetUserId = null } = {}) {
    const [workoutResult, mealResult, progressResult, missedResult] = await Promise.all([
      this.generateWorkoutReminders({ date, targetUserId }),
      this.generateMealReminders({ date, forceSlot, targetUserId }),
      this.generateProgressReminders({ date, targetUserId }),
      this.generateMissedWorkoutCheckin({ date, targetUserId })
    ]);

    return {
      timestamp: date.toISOString(),
      results: {
        workout: workoutResult,
        meal: mealResult,
        progress: progressResult,
        missed: missedResult
      },
      totalCreated: (workoutResult.createdCount || 0) + (mealResult.createdCount || 0) + (progressResult.createdCount || 0) + (missedResult.createdCount || 0)
    };
  }
};

export default reminderScheduler;
