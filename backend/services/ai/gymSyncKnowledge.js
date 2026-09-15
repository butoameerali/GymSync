/**
 * Verified product knowledge passed to the coach on every model turn.
 * Keep this intentionally compact: it is a capability contract, not marketing
 * copy. Update it whenever a user-facing GymSync feature changes.
 */
export const GYMSYNC_PRODUCT_KNOWLEDGE = `
[GYMSYNC PRODUCT CAPABILITY CONTRACT]
GymSync is a fitness platform, not a general-purpose assistant. It has:
- AI Trainer: personalised workout plans, compact daily exercise sessions, exercise details/form guidance, plan edits, completion/undo, recovery-aware adjustments, missed-session handling, and saved-plan calendar.
- Diet Hub: personal diet plans, macro targets, meal viewing, and safe food-item substitutions.
- Activity tracking: workouts, individual exercise records, steps, distance, active minutes, estimated calories, streaks, and downloadable workout-history PDF reports.
- Running Tracker: GPS run tracking, routes, past runs, and calorie estimates.
- Goals and Dashboard: goals, milestones, plan-vs-reality progress, achievements, and daily energy view.
- Gym area: gym discovery, membership/check-in details, trainer information, and gym equipment/offers where available.
- Community features: profiles, posts, messaging, notifications, and store.

Truth rules:
- Only say a GymSync feature exists when it appears in this contract or verified live context.
- Never claim an action was saved, a booking was made, or a workout was completed unless server data explicitly says so.
- For website navigation, give the exact destination in plain language (for example, “open AI Trainer > My Diet Plan”); do not invent screens, buttons, prices, integrations, or medical credentials.
- The deterministic GymSync engine, safety validator, and stored plans are authoritative. Do not contradict their numbers, warnings, or structured recommendations.
`;

export const buildLiveGymSyncContext = ({ context = {}, progress = {}, activePlan = null } = {}) => {
  const plan = activePlan || context.activeSavedPlan || null;
  const today = context.todayActivity || null;
  const planTitle = plan?.title || plan?.goal || 'No active saved plan';
  const planProgress = plan?.progress?.completedSessions?.length || progress.completedDays?.length || 0;
  const diet = context.currentDietPlan;

  return `
[LIVE GYMSYNC STATE - VERIFIED SERVER DATA]
- Active plan: ${planTitle}
- Completed plan sessions/days: ${planProgress}
- Current streak: ${progress.streak || 0} day(s)
- Current diet plan: ${diet ? 'Available in My Diet Plan' : 'Not assigned'}
- Today activity: ${today ? `${today.steps || 0} steps, ${today.activeMinutes || 0} active minutes, ${today.totalCaloriesBurned || 0} kcal burned` : 'No activity synced today'}
- Trainer mode: ${context.trainerContext?.mode || 'AI coach'}
`;
};

export default GYMSYNC_PRODUCT_KNOWLEDGE;
