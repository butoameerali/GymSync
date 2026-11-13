import UserWorkoutProgram from '../../models/UserWorkoutProgram.js';
import SavedAIPlan from '../../models/SavedAIPlan.js';
import WeightLossEnrollment from '../../models/WeightLossEnrollment.js';

/**
 * Program Gate Service
 * Enforces Product Rule R3: A user can have exactly ONE active program at a time.
 */
export const programGate = {
  /**
   * Check if a user is eligible to join a new workout program.
   * Blocks joining if an active program already exists.
   *
   * @param {string|Object} userId - MongoDB ObjectId or string ID
   * @returns {Promise<{ canJoin: boolean, message?: string, activeProgram?: Object }>}
   */
  async canJoin(userId) {
    if (!userId) {
      return { canJoin: false, message: 'User ID is required' };
    }

    // 1. Check for active human-authored / instructor workout program
    // Completed programs (isCompleted: true) do NOT block joining a new program!
    const activeUserProgram = await UserWorkoutProgram.findOne({
      userId,
      isActive: true,
      isCompleted: { $ne: true }
    }).lean();

    if (activeUserProgram) {
      // Check if all sessions are finished even if isCompleted flag was not set yet
      const totalWorkoutDays = (activeUserProgram.weeks || []).reduce(
        (acc, w) => acc + (w.days || []).filter(d => !d.isRestDay).length,
        0
      );
      const completedSessionsCount = (activeUserProgram.progress?.completedSessions || []).length;
      const isActuallyDone = Boolean(
        activeUserProgram.isCompleted ||
        (totalWorkoutDays > 0 && completedSessionsCount >= totalWorkoutDays)
      );

      if (isActuallyDone) {
        // Auto-heal the record to completed & inactive so next program can be joined
        await UserWorkoutProgram.updateOne(
          { _id: activeUserProgram._id },
          { $set: { isCompleted: true, isActive: false } }
        );
        await WeightLossEnrollment.updateMany(
          { userId, userWorkoutProgramId: activeUserProgram._id },
          { $set: { status: 'Completed', isActive: false } }
        ).catch(() => {});
        // Completed program does NOT block joining a new program — proceed to next checks
      } else {
        // Active program is STILL IN PROGRESS — Rule R3 enforces exactly ONE active program
        return {
          canJoin: false,
          message: 'Finish or leave your current program first',
          activeProgram: {
            id: activeUserProgram._id,
            sourceProgramId: activeUserProgram.sourceProgramId,
            title: activeUserProgram.title,
            type: 'UserWorkoutProgram'
          }
        };
      }
    }

    // 2. Check for active SavedAIPlan
    const activeSavedPlan = await SavedAIPlan.findOne({
      userId,
      isActive: true
    }).lean();

    if (activeSavedPlan) {
      return {
        canJoin: false,
        message: 'Finish or leave your current program first',
        activeProgram: {
          id: activeSavedPlan._id,
          title: activeSavedPlan.title,
          type: 'SavedAIPlan'
        }
      };
    }

    // 3. Check for active WeightLossEnrollment
    // Completed or replaced enrollments do NOT block joining a new program!
    const activeWeightLoss = await WeightLossEnrollment.findOne({
      userId,
      isActive: true,
      status: { $nin: ['Completed', 'Cancelled', 'Replaced'] }
    }).lean();

    if (activeWeightLoss) {
      if (activeWeightLoss.userWorkoutProgramId) {
        const linkedProg = await UserWorkoutProgram.findById(activeWeightLoss.userWorkoutProgramId).select('isCompleted isActive weeks progress').lean();
        const linkedTotalDays = (linkedProg?.weeks || []).reduce((acc, w) => acc + (w.days || []).filter(d => !d.isRestDay).length, 0);
        const linkedSessionsCount = (linkedProg?.progress?.completedSessions || []).length;
        const linkedIsDone = !linkedProg || !linkedProg.isActive || linkedProg.isCompleted || (linkedTotalDays > 0 && linkedSessionsCount >= linkedTotalDays);

        if (linkedIsDone) {
          // Linked program is completed/inactive -> auto mark enrollment completed
          await WeightLossEnrollment.updateOne({ _id: activeWeightLoss._id }, { $set: { isActive: false, status: 'Completed' } });
        } else {
          return {
            canJoin: false,
            message: 'Finish or leave your current program first',
            activeProgram: {
              id: activeWeightLoss._id,
              title: activeWeightLoss.templateType || 'Weight Loss Program',
              type: 'WeightLossEnrollment'
            }
          };
        }
      } else {
        return {
          canJoin: false,
          message: 'Finish or leave your current program first',
          activeProgram: {
            id: activeWeightLoss._id,
            title: activeWeightLoss.templateType || 'Weight Loss Program',
            type: 'WeightLossEnrollment'
          }
        };
      }
    }

    return { canJoin: true };
  }
};

export default programGate;
