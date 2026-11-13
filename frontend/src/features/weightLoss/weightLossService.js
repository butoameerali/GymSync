import { get, post } from '../../services/api';

/**
 * Service client for Weight Loss program and safety engine endpoints.
 */
export const weightLossService = {
  /**
   * Check user eligibility for enrolling in the weight loss program.
   */
  async checkEligibility(params = {}) {
    const query = new URLSearchParams();
    if (params.targetWeightKg) query.set('targetWeightKg', params.targetWeightKg);
    if (params.targetDurationWeeks) query.set('targetDurationWeeks', params.targetDurationWeeks);
    if (params.medicalWarningAcknowledged) query.set('medicalWarningAcknowledged', 'true');
    if (params.seniorAcknowledged) query.set('seniorAcknowledged', 'true');

    const qs = query.toString();
    const endpoint = `/weight-loss/eligibility${qs ? `?${qs}` : ''}`;
    return await get(endpoint);
  },

  /**
   * Calculate metabolic projections, realistic timelines, and safe rate bands.
   */
  async calculateProjections(payload) {
    return await post('/weight-loss/calculate', payload);
  },

  /**
   * Enroll in the weight loss program using human-authored templates.
   */
  async enroll(payload) {
    return await post('/weight-loss/enroll', payload);
  },

  /**
   * Fetch current active enrollment and user program progress.
   */
  async getActiveEnrollment() {
    return await get('/weight-loss/active');
  },

  /**
   * Record optional check-in (weight, waist, or notes).
   */
  async recordWeighIn(payload) {
    return await post('/weight-loss/weigh-in', payload);
  },

  /**
   * Cancel / leave current weight loss program.
   */
  async cancelEnrollment() {
    return await post('/weight-loss/cancel', {});
  }
};

export default weightLossService;
