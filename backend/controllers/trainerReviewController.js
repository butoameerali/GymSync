import TrainerReview from '../models/TrainerReview.js';
import GoalGroup from '../models/GoalGroup.js';
import Notification from '../models/Notification.js';

/**
 * @desc    Get all pending trainer reviews for the review queue
 * @route   GET /api/ai/trainer-reviews
 * @access  Private (GymTrainer, Admin, SuperAdmin)
 */
export const getPendingReviewsController = async (req, res) => {
  try {
    const reviews = await TrainerReview.find({ status: 'Pending' })
      .populate('userId', 'name email profilePic')
      .populate('goalGroupId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    console.error('getPendingReviewsController Error:', error);
    res.status(500).json({ message: 'Failed to fetch pending reviews' });
  }
};

/**
 * @desc    Approve a pending goal target or injury plan review
 * @route   POST /api/ai/trainer-reviews/:id/approve
 * @access  Private (GymTrainer, Admin, SuperAdmin)
 */
export const approveReviewController = async (req, res) => {
  try {
    const review = await TrainerReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Trainer review request not found' });
    }

    if (review.status !== 'Pending') {
      return res.status(400).json({ message: `Review is already ${review.status.toLowerCase()}` });
    }

    review.status = 'Approved';
    review.trainerNotes = (req.body.trainerNotes || req.body.notes || '').trim();
    review.resolvedAt = new Date();
    review.resolvedBy = req.user._id;
    review.assignedTrainerId = req.user._id;
    await review.save();

    // If review is linked to a GoalGroup, activate it
    let activatedGoalGroup = null;
    if (review.goalGroupId) {
      activatedGoalGroup = await GoalGroup.findById(review.goalGroupId);
      if (activatedGoalGroup) {
        // Archive other active goals for the user
        await GoalGroup.updateMany(
          { userId: activatedGoalGroup.userId, _id: { $ne: activatedGoalGroup._id }, status: 'Active' },
          { status: 'Completed', completedAt: new Date() }
        );

        activatedGoalGroup.status = 'Active';
        await activatedGoalGroup.save();
      }
    }

    // Send a system notification to the trainee
    try {
      await Notification.create({
        userId: String(review.userId),
        recipientId: review.userId,
        senderId: req.user._id,
        sender: req.user.name || 'Certified Trainer',
        type: 'system',
        title: 'Goal Target Approved',
        message: review.trainerNotes
          ? `Your goal has been approved by your trainer: "${review.trainerNotes}". Your plan is now active!`
          : 'Your requested goal target has been reviewed and approved by certified staff. Your plan is now active!',
        link: '/ai-trainer'
      });
    } catch (notifErr) {
      console.warn('Could not create approval notification:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: 'Review approved and goal plan activated',
      review,
      goalGroup: activatedGoalGroup
    });
  } catch (error) {
    console.error('approveReviewController Error:', error);
    res.status(500).json({ message: 'Failed to approve review' });
  }
};

/**
 * @desc    Reject a pending review and recommend a safe alternative
 * @route   POST /api/ai/trainer-reviews/:id/reject
 * @access  Private (GymTrainer, Admin, SuperAdmin)
 */
export const rejectReviewController = async (req, res) => {
  try {
    const review = await TrainerReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Trainer review request not found' });
    }

    if (review.status !== 'Pending') {
      return res.status(400).json({ message: `Review is already ${review.status.toLowerCase()}` });
    }

    const trainerNotes = (req.body.trainerNotes || req.body.notes || 'Target requires adjustment for physiological safety').trim();
    const safeAlternative = (req.body.safeAlternative || req.body.safeAlternativeSuggestion || 'Maintain current weight, focus on strength and metabolic conditioning').trim();

    review.status = 'Rejected';
    review.trainerNotes = trainerNotes;
    review.safeAlternativeSuggestion = safeAlternative;
    review.resolvedAt = new Date();
    review.resolvedBy = req.user._id;
    review.assignedTrainerId = req.user._id;
    await review.save();

    // Mark linked GoalGroup as Abandoned (never leave dangling in PendingReview)
    if (review.goalGroupId) {
      await GoalGroup.findByIdAndUpdate(review.goalGroupId, {
        status: 'Abandoned',
        completedAt: new Date()
      });
    }

    // Send informative advisory notification to the trainee
    try {
      await Notification.create({
        userId: String(review.userId),
        recipientId: review.userId,
        senderId: req.user._id,
        sender: req.user.name || 'Certified Trainer',
        type: 'system',
        title: 'Goal Target Advisory',
        message: `Your requested target was reviewed by staff: "${trainerNotes}". Recommended path: "${safeAlternative}".`,
        link: '/ai-trainer'
      });
    } catch (notifErr) {
      console.warn('Could not create rejection notification:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: 'Review rejected with constructive safety recommendations',
      review,
      safeAlternative
    });
  } catch (error) {
    console.error('rejectReviewController Error:', error);
    res.status(500).json({ message: 'Failed to reject review' });
  }
};
