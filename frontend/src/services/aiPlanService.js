import { apiJson, get, post } from './api.js';

export const aiPlanService = {
  getSavedPlans: async () => {
    return await get('/ai/saved-plans');
  },

  savePlan: async (planData) => {
    return await post('/ai/saved-plans', planData);
  },

  deletePlan: async (planId) => {
    return await apiJson(`/api/ai/saved-plans/${planId}`, { method: 'DELETE' });
  }
};

export default aiPlanService;
