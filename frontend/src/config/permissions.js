/**
 * GymSync Strict Role Capability & Permission Matrix
 * 
 * Centralized authorization engine for frontend UI/UX isolation.
 * Note: Backend RBAC middleware remains the final security authority.
 */

export const ROLE_PERMISSIONS = {
  Guest: {
    landing: ['view'],
    auth: ['login', 'register'],
    exercises: ['view_public'],
    gyms: ['view_public'],
    profile: ['view_public']
  },

  User: {
    dashboard: ['view_trainee'],
    workout: ['player', 'ai_trainer', 'pushup_ai', 'running_gps', 'history'],
    exercises: ['view'],
    gyms: ['discover', 'join', 'view_membership', 'view_attendance'],
    social: ['view_feed', 'create_post', 'edit_own_post', 'delete_own_post', 'like', 'comment', 'friend_request', 'chat'],
    store: ['browse', 'cart', 'checkout', 'purchase', 'view_own_orders'],
    complaints: ['submit', 'view_own'],
    profile: ['view_own', 'edit_own', 'health_bio_privacy', 'hide_height_weight']
  },

  GymOwner: {
    dashboard: ['view_gym_owner'],
    gym_management: ['register_facility', 'edit_facility', 'view_members', 'manage_members', 'check_in_out', 'manage_trainers', 'stats'],
    social: ['view_feed', 'create_post', 'edit_own_post', 'delete_own_post', 'like', 'comment', 'chat'],
    complaints: ['submit', 'view_gym_support'],
    profile: ['view_own', 'edit_own']
  },

  GymTrainer: {
    dashboard: ['view_trainer'],
    trainees: ['view_assigned', 'assign_workout_plan', 'assign_diet_plan', 'track_progress', 'chat'],
    exercises: ['view_library'],
    profile: ['view_own', 'edit_own']
    // Explicitly NO health_bio_privacy or hide_height_weight (Trainee only)
  },

  FitnessInstructor: {
    dashboard: ['view_instructor'],
    exercises: ['create', 'edit', 'delete', 'manage_ai_detectors'],
    profile: ['view_own', 'edit_own']
  },

  StoreManager: {
    dashboard: ['view_store_manager'],
    store_management: ['create_product', 'edit_product', 'delete_product', 'manage_inventory', 'view_all_orders', 'verify_payments'],
    profile: ['view_own', 'edit_own']
    // Explicitly NO customer cart, checkout or AI trainer
  },

  ComplaintModerator: {
    dashboard: ['view_moderator'],
    complaint_moderation: ['view_queue', 'assign', 'resolve', 'delete_flagged_content'],
    profile: ['view_own', 'edit_own']
  },

  Admin: {
    dashboard: ['view_admin'],
    admin_tools: ['view_kpis', 'manage_users', 'approve_gyms', 'moderate_complaints', 'verify_payments', 'view_audit_logs'],
    exercises: ['view', 'manage_if_authorized'],
    profile: ['view_own', 'edit_own']
    // Explicitly NO customer store purchasing or trainee AI workout player
  },

  SuperAdmin: {
    dashboard: ['view_superadmin'],
    admin_tools: ['view_kpis', 'manage_users', 'manage_roles', 'approve_gyms', 'moderate_complaints', 'verify_payments', 'view_audit_logs', 'system_config'],
    exercises: ['view', 'manage_if_authorized'],
    profile: ['view_own', 'edit_own']
    // Explicitly NO customer store purchasing or trainee AI workout player
  }
};

/**
 * Check if a given role has permission to perform an action on a resource.
 * @param {string} role - The user's role (e.g. 'User', 'Admin', 'GymTrainer')
 * @param {string} resource - The target feature domain (e.g. 'workout', 'store_management', 'profile')
 * @param {string} action - The action requested (e.g. 'ai_trainer', 'verify_payments', 'health_bio_privacy')
 * @returns {boolean} True if allowed, false otherwise.
 */
export const hasPermission = (role, resource, action) => {
  if (!role || !resource || !action) return false;
  const roleRules = ROLE_PERMISSIONS[role];
  if (!roleRules) return false;
  const resourceActions = roleRules[resource];
  if (!resourceActions) return false;
  return resourceActions.includes(action);
};

/**
 * Convenience alias for hasPermission
 */
export const can = hasPermission;
