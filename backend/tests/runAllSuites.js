import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const suites = [
  { name: 'Role Isolation, Verification & Security Suite', file: 'testRoleIsolationAndBranchVerification.js' },
  { name: 'Phase 7 Authoritative AI Context & Adversarial Suite', file: 'testPhase7AuthoritativeSecurity.js' },
  { name: 'Phase 6 Final Hardening & Adversarial Suite', file: 'testPhase6ComprehensiveHardening.js' },
  { name: 'Phase 5 Security & Integrity Audit Suite', file: 'testPhase5SecurityAudit.js' },
  { name: 'Phase 4 Hardening & Security Suite', file: 'testPhase4Hardening.js' },
  { name: 'Exercise Bridge Suite', file: 'testExerciseBridge.js' },
  { name: 'Phase 3 Integration & Security Suite', file: 'testPhase3Suites.js' },
  { name: 'Phase 2 Access & Inventory Hardening Suite', file: 'testPhase2Hardening.js' },
  { name: 'Filter & Security Hardening Suite', file: 'testFilterAndSecurityHardening.js' },
  { name: 'AI Decision Engine Unit Suite', file: 'aiTrainerDecisionEngine.test.js' },
  { name: 'Conversational Coach Adaptive Suite', file: 'conversationalCoachAdaptive.test.js' },
  { name: 'Phase 1 Health Bio & Calorie Persistence Suite', file: 'testPhase1HealthAndCalories.js' },
  { name: 'Phase 2 Goal Engine, Safety & Trainer Review Suite', file: 'testPhase2GoalAndSafety.js' },
  { name: 'Phase 0 QA Defects & Architectural Gates Suite', file: 'testPhase0Defects.js' },
  { name: 'Phase 1 R1 & R2 Product Policy Suite', file: 'testPhase1R1R2Policy.js' },
  { name: 'Phase 2 Weight Loss Program & Safety Engine Suite', file: 'testPhase2WeightLoss.js' },
  { name: 'Phase 3 Notifications, Web Push & Reminder Scheduler Suite', file: 'testPhase3Notifications.js' },
  { name: 'Phase 4 Food Logging & Pakistani Food Database Suite', file: 'testPhase4FoodLogging.js' },
  { name: 'Phase 5 AI Coach Behavior & Integrity Suite', file: 'testPhase5AICoach.js' },
  { name: 'Phase 6 Master Regression QA Suite', file: 'testPhase6RegressionQA.js' }
];

console.log('===============================================================');
console.log('🚀 GYMSYNC COMPREHENSIVE AUTOMATED TEST RUNNER');
console.log('===============================================================\n');

let totalSuites = suites.length;
let passedSuites = 0;
let failedSuites = 0;

async function runSuite(suite) {
  return new Promise((resolve) => {
    console.log(`\n▶️ RUNNING: ${suite.name} (${suite.file})...`);
    const start = Date.now();
    const child = spawn('node', [path.join(__dirname, suite.file)], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`✅ PASSED: ${suite.name} in ${duration}s`);
        passedSuites++;
        resolve(true);
      } else {
        console.error(`❌ FAILED: ${suite.name} with exit code ${code} (${duration}s)`);
        failedSuites++;
        resolve(false);
      }
    });

    child.on('error', (err) => {
      console.error(`❌ ERROR launching ${suite.name}:`, err.message);
      failedSuites++;
      resolve(false);
    });
  });
}

async function main() {
  for (const suite of suites) {
    await runSuite(suite);
  }

  console.log('\n===============================================================');
  console.log(`📊 FINAL TEST REPORT: ${passedSuites}/${totalSuites} SUITES PASSED`);
  if (failedSuites > 0) {
    console.error(`❌ ${failedSuites} SUITE(S) FAILED`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL SUITES PASSED FLAWLESSLY!`);
    process.exit(0);
  }
}

main();
