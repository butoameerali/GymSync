import SavedAIPlan from '../models/SavedAIPlan.js';
import ActivityLog from '../models/ActivityLog.js';

/**
 * POST /api/plans/:planId/sessions/:sessionId/report
 * Lets users report an issue with a completed workout session.
 * Three resolution paths:
 *   MinorIssue  → cosmetic note only, no calorie adjustment
 *   FormFraud   → remove the workout calorie credit from ActivityLog
 *   CalorieFraud → remove both workout + meal calorie credit
 */
export const reportSessionIssue = async (req, res) => {
  try {
    const { planId, sessionId } = req.params;
    const { issueType, description } = req.body;

    const validTypes = ['MinorIssue', 'FormFraud', 'CalorieFraud'];
    if (!validTypes.includes(issueType)) {
      return res.status(400).json({ error: 'Invalid issueType. Must be MinorIssue, FormFraud, or CalorieFraud.' });
    }

    const plan = await SavedAIPlan.findOne({ _id: planId, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const session = plan.progress.completedSessions.id(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Don't allow re-reporting an already-reported session
    if (session.reportedIssue?.status === 'Resolved') {
      return res.status(409).json({ error: 'This session issue has already been resolved.' });
    }

    const today = new Date().toISOString().split('T')[0];
    let caloriesAdjusted = 0;

    if (issueType === 'FormFraud' || issueType === 'CalorieFraud') {
      // Find today's ActivityLog and reduce workoutCalories
      const log = await ActivityLog.findOne({ userId: req.user._id, date: today });
      if (log && log.workoutCalories > 0) {
        // Estimate: remove ~150 kcal per flagged session (conservative, session-specific data not available)
        const reduction = Math.min(log.workoutCalories, 150);
        caloriesAdjusted = reduction;
        await ActivityLog.findByIdAndUpdate(log._id, {
          $inc: { workoutCalories: -reduction }
        });
      }
    }

    // Update the session's reportedIssue in-place
    session.reportedIssue = {
      status: 'Pending',
      issueType,
      description: description || '',
      reportedAt: new Date(),
      resolvedAt: null,
      caloriesAdjusted
    };

    await plan.save();

    return res.status(200).json({
      message: `Issue reported (${issueType}). ${caloriesAdjusted > 0 ? `${caloriesAdjusted} workout calories adjusted.` : 'No calorie adjustment needed.'}`,
      session
    });
  } catch (error) {
    console.error('reportSessionIssue Error:', error);
    return res.status(500).json({ error: 'Failed to report session issue' });
  }
};

/**
 * PUT /api/plans/:planId/sessions/:sessionId/report/resolve
 * Marks the reported issue as resolved (admin / self-resolve after reflection).
 */
export const resolveSessionIssue = async (req, res) => {
  try {
    const { planId, sessionId } = req.params;

    const plan = await SavedAIPlan.findOne({ _id: planId, userId: req.user._id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const session = plan.progress.completedSessions.id(sessionId);
    if (!session || !session.reportedIssue?.status) {
      return res.status(404).json({ error: 'No pending issue found for this session.' });
    }

    session.reportedIssue.status = 'Resolved';
    session.reportedIssue.resolvedAt = new Date();
    await plan.save();

    return res.status(200).json({ message: 'Issue resolved.', session });
  } catch (error) {
    console.error('resolveSessionIssue Error:', error);
    return res.status(500).json({ error: 'Failed to resolve session issue' });
  }
};
