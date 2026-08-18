import { ROLE_PERMISSIONS, can } from '../frontend/src/config/permissions.js';

let passed = 0;
let failed = 0;

function assertPermission(role, resource, action, expected, testName) {
  const result = can(role, resource, action);
  if (result === expected) {
    console.log(`[PASS] ✅ ${testName}: ${role} -> ${resource}:${action} === ${expected}`);
    passed++;
  } else {
    console.error(`[FAIL] ❌ ${testName}: Expected ${role} -> ${resource}:${action} to be ${expected}, got ${result}`);
    failed++;
  }
}

console.log('\n====================================================');
console.log('🛡️ GymSync Role UI Contract & Capability Audit Suite');
console.log('====================================================\n');

// 1. User Assertions
assertPermission('User', 'workout', 'ai_trainer', true, 'TEST 1: User can access AI Trainer');
assertPermission('User', 'workout', 'running_gps', true, 'TEST 2: User can access Running GPS');
assertPermission('User', 'store', 'purchase', true, 'TEST 3: User can purchase in store');
assertPermission('User', 'admin_tools', 'view_kpis', false, 'TEST 4: User blocked from Admin KPIs');
assertPermission('User', 'exercises', 'create', false, 'TEST 5: User blocked from creating exercises');

// 2. GymOwner Assertions
assertPermission('GymOwner', 'gym_management', 'register_facility', true, 'TEST 6: GymOwner can register gym');
assertPermission('GymOwner', 'gym_management', 'check_in_out', true, 'TEST 7: GymOwner can check-in attendance');
assertPermission('GymOwner', 'admin_tools', 'view_kpis', false, 'TEST 8: GymOwner blocked from Admin KPIs');
assertPermission('GymOwner', 'store_management', 'create_product', false, 'TEST 9: GymOwner blocked from Store Management');

// 3. GymTrainer Assertions
assertPermission('GymTrainer', 'trainees', 'view_assigned', true, 'TEST 10: GymTrainer can view assigned trainees');
assertPermission('GymTrainer', 'trainees', 'assign_workout_plan', true, 'TEST 11: GymTrainer can assign workout plans');
assertPermission('GymTrainer', 'profile', 'health_bio_privacy', false, 'TEST 12: GymTrainer blocked from Trainee health privacy controls');
assertPermission('GymTrainer', 'admin_tools', 'view_kpis', false, 'TEST 13: GymTrainer blocked from Admin tools');

// 4. FitnessInstructor Assertions
assertPermission('FitnessInstructor', 'exercises', 'create', true, 'TEST 14: FitnessInstructor can create exercises');
assertPermission('FitnessInstructor', 'exercises', 'edit', true, 'TEST 15: FitnessInstructor can edit exercises');
assertPermission('FitnessInstructor', 'store_management', 'create_product', false, 'TEST 16: FitnessInstructor blocked from Store Management');

// 5. StoreManager Assertions
assertPermission('StoreManager', 'store_management', 'create_product', true, 'TEST 17: StoreManager can manage store products');
assertPermission('StoreManager', 'store_management', 'view_all_orders', true, 'TEST 18: StoreManager can process orders');
assertPermission('StoreManager', 'store', 'cart', false, 'TEST 19: StoreManager blocked from customer shopping cart');
assertPermission('StoreManager', 'workout', 'ai_trainer', false, 'TEST 20: StoreManager blocked from AI Trainer');

// 6. ComplaintModerator Assertions
assertPermission('ComplaintModerator', 'complaint_moderation', 'view_queue', true, 'TEST 21: ComplaintModerator can view queue');
assertPermission('ComplaintModerator', 'complaint_moderation', 'resolve', true, 'TEST 22: ComplaintModerator can resolve complaints');
assertPermission('ComplaintModerator', 'store_management', 'create_product', false, 'TEST 23: ComplaintModerator blocked from store management');

// 7. Admin Assertions
assertPermission('Admin', 'admin_tools', 'view_kpis', true, 'TEST 24: Admin can view system KPIs');
assertPermission('Admin', 'admin_tools', 'approve_gyms', true, 'TEST 25: Admin can approve gyms');
assertPermission('Admin', 'store', 'purchase', false, 'TEST 26: Admin blocked from customer store shopping');
assertPermission('Admin', 'profile', 'health_bio_privacy', false, 'TEST 27: Admin blocked from Trainee health privacy controls');

// 8. SuperAdmin Assertions
assertPermission('SuperAdmin', 'admin_tools', 'manage_roles', true, 'TEST 28: SuperAdmin can manage user roles');
assertPermission('SuperAdmin', 'admin_tools', 'system_config', true, 'TEST 29: SuperAdmin can configure system');
assertPermission('SuperAdmin', 'store', 'purchase', false, 'TEST 30: SuperAdmin blocked from customer store shopping');

console.log('\n====================================================');
console.log(`📊 ROLE UI CONTRACT AUDIT SUMMARY`);
console.log(`Total Assertions: ${passed + failed}`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ❌`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
